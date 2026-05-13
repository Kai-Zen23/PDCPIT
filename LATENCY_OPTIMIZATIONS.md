# Latency Optimization Strategy for Card Clash 21

## Executive Summary
Current latency bottlenecks identified:
1. **Backend**: Multiple Redis round-trips per command (view serialization + state update + cleanup)
2. **Network**: Full state sent on every update (no differential updates despite `match:patch` capability)
3. **Frontend**: Unused code-splitting; all components loaded at once
4. **WebSocket**: No connection pooling; no heartbeat optimization
5. **Data**: Inefficient `viewForPlayer()` serialization on every state change

---

## Priority 1: Backend Optimization (Estimated 200-300ms latency reduction)

### 1.1 Reduce Redis Round-Trips in Command Processing
**Current flow:**
```
matchCommandSchema.safeParse() → getMatch() → commandDraw() → saveRecord() → 
maybeAdvanceAfterRound() → updateMatchState() → emitState() → viewForPlayer()
```
**Problem:** `saveRecord()` does multi-operation Redis transactions; `emitState()` calls `viewForPlayer()` for each player (CPU-bound).

**Fix:** Batch Redis operations and cache view computations
```typescript
// In server.ts, optimize processNextCommand:
async function processNextCommand(matchId: string) {
  // ... validation ...
  const record = await getMatch(matchId);
  
  // Cache computed view BEFORE state modifications
  const playerViews = new Map<string, MatchViewForPlayer>();
  for (const playerId of record.match.playerOrder) {
    playerViews.set(playerId, viewForPlayer(record.match, playerId));
  }
  
  // Execute command (modifies match in-memory)
  let events: MatchEvent[] = [];
  if (type === "DRAW") events = commandDraw(record.match, playerId);
  // ...
  
  // Single multi-operation save
  const multi = redis.multi();
  await saveRecord(record, multi);
  await multi.exec();
  
  // Send ONLY differential patches (computed from cached view)
  for (const playerId of record.match.playerOrder) {
    const newView = viewForPlayer(record.match, playerId);
    const patch = computeDiff(playerViews.get(playerId)!, newView);
    io.to(playerRoom(playerId)).emit("match:patch", { patch, hash: record.match.id });
  }
}

// Utility: Compute differential updates
function computeDiff(oldView: MatchViewForPlayer, newView: MatchViewForPlayer) {
  return {
    type: "STATE_UPDATE",
    changes: {
      ...(oldView.round?.you.totalVisible !== newView.round?.you.totalVisible && { yourTotal: newView.round?.you.totalVisible }),
      ...(oldView.opponent?.powerUpsCount !== newView.opponent?.powerUpsCount && { oppPowerUps: newView.opponent?.powerUpsCount }),
      // ... minimal diff payload
    }
  };
}
```
**Estimated savings:** 50-100ms per command (eliminate redundant `emitState()` full state broadcasts)

---

### 1.2 Optimize `viewForPlayer()` with Memoization
**Current:** `viewForPlayer()` runs reduce loops over hand cards for EVERY state update.
**Fix:** Add a computed properties cache in MatchState.

```typescript
// In types.ts, add to MatchState:
export type MatchState = {
  // ... existing fields ...
  _cachedViews?: {
    hash: string;
    views: Record<string, MatchViewForPlayer>;
  };
};

// In engine.ts, after state-modifying operations:
function invalidateViewCache(match: MatchState) {
  delete match._cachedViews;
}

// Update viewForPlayer to use cache:
export function viewForPlayer(match: MatchState, playerId: string): MatchViewForPlayer {
  if (match._cachedViews) {
    return match._cachedViews.views[playerId];
  }
  
  // ... compute view as before ...
  
  // Cache the result
  match._cachedViews = {
    hash: match.id,
    views: { [playerId]: result }
  };
  return result;
}
```
**Estimated savings:** 30-50ms per command (avoid repeated hand summation)

---

### 1.3 Reduce Lua Script Overhead in `findWaitingMatchId()`
**Current:** 10 attempts × 2 Redis calls per attempt = up to 20 round-trips.
**Fix:** Use `ZRANDMEMBER` or batch verification.

```typescript
export async function findWaitingMatchId(): Promise<string | null> {
  // Get 5 random candidates in one call
  const candidates = await redis.srandmember(WAITING_MATCHES_SET, 5);
  if (!Array.isArray(candidates)) return null; // 0 or 1 result
  
  for (const id of candidates) {
    const isValid = await (redis as any).atomicVerifyWaitingMatch(
      MATCH_KEY(id),
      WAITING_MATCHES_SET,
      id
    );
    if (isValid) return id;
  }
  return null;
}
```
**Estimated savings:** 30-40ms (reduce round-trips by batch operation)

---

### 1.4 Optimize AI Bot Decision Latency
**Current:** Worker thread spawned per turn = 2-5ms overhead.
**Fix:** Maintain a persistent worker pool.

```typescript
// In server.ts, create persistent worker pool
import { Worker } from "worker_threads";
import os from "os";

const WORKER_POOL_SIZE = os.cpus().length;
const botWorkerPool: Worker[] = [];
let poolIndex = 0;

function initBotWorkerPool() {
  for (let i = 0; i < WORKER_POOL_SIZE; i++) {
    const worker = new Worker(botWorkerPath);
    worker.on("error", (err) => console.error("[Worker Error]", err));
    botWorkerPool.push(worker);
  }
}

// In bot decision logic:
const decision: { type: "DRAW" | "STAND" | "POWER_UP"; payload?: any } = await new Promise((resolve, reject) => {
  const worker = botWorkerPool[poolIndex % WORKER_POOL_SIZE];
  poolIndex++;
  
  const timeoutId = setTimeout(() => reject(new Error("Bot decision timeout")), 1000);
  
  const handler = (msg: any) => {
    clearTimeout(timeoutId);
    worker.off("message", handler);
    resolve(msg);
  };
  
  worker.once("message", handler);
  worker.postMessage({ /* data */ });
});
```
**Estimated savings:** 2-5ms per bot turn (eliminate spawn overhead)

---

## Priority 2: Frontend Optimization (Estimated 100-150ms latency reduction)

### 2.1 Code Splitting and Lazy Loading
**Current:** All routes load immediately.
**Fix:** Implement dynamic imports.

```typescript
// In routes.ts
import { lazy, Suspense } from "react";

const MainMenu = lazy(() => import("./components/MainMenu"));
const Gameplay = lazy(() => import("./components/Gameplay"));
const Victory = lazy(() => import("./components/Victory"));

export const router = createBrowserRouter([
  {
    path: "/",
    Component: () => <Suspense fallback={<div>Loading...</div>}><MainMenu /></Suspense>
  },
  // ...
]);
```
**Estimated savings:** 50-100ms (faster initial page load; defer non-critical code)

---

### 2.2 Optimize Socket.IO Connection
**Current:** `autoConnect: false` → manual connect later; no connection pooling.
**Fix:** Add connection pooling and heartbeat tuning.

```typescript
// In backend.ts
export function createBackendSocket(): BackendSocket {
  return io(backendBaseUrl(), {
    transports: ["websocket"],
    autoConnect: false,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
    // Reduce heartbeat overhead
    pingInterval: 25000, // Server sends ping every 25s
    pingTimeout: 20000,  // Wait 20s for pong
  }) as BackendSocket;
}
```
**Estimated savings:** 10-20ms (reduce handshake latency)

---

### 2.3 Batch Frontend State Updates
**Current:** Each event triggers full re-render.
**Fix:** Debounce state updates or use differential patches.

```typescript
// In state management (e.g., hooks)
import { useDeferredValue } from "react";

export function useMatchState(matchView: MatchView) {
  // Defer non-critical view updates to reduce input lag
  const deferredView = useDeferredValue(matchView);
  return deferredView;
}

// Consume events in batch (e.g., every 50ms) instead of individually
let pendingEvents: MatchEvent[] = [];
let eventBatchTimer: NodeJS.Timeout | null = null;

socket.on("match:event", (event) => {
  pendingEvents.push(event);
  
  if (!eventBatchTimer) {
    eventBatchTimer = setTimeout(() => {
      // Process all events together
      applyEventsToState(pendingEvents);
      pendingEvents = [];
      eventBatchTimer = null;
    }, 16); // 60fps batch window
  }
});
```
**Estimated savings:** 20-30ms (reduce React re-renders)

---

## Priority 3: Network Optimization (Estimated 50-100ms latency reduction)

### 3.1 Enable Gzip Compression
**Current:** No compression configured.
**Fix:** Add compression middleware.

```typescript
// In server.ts
import compression from "compression";

app.use(compression());
```

**In Nginx:**
```nginx
http {
  gzip on;
  gzip_types text/plain application/json application/javascript;
  gzip_min_length 1000;
  gzip_comp_level 6;
}
```
**Estimated savings:** 30-50ms (reduce payload size by 60-80%)

---

### 3.2 Optimize Payload Size
**Current:** `viewForPlayer()` sends full hand data even if unchanged.
**Fix:** Implement proper differential updates (use existing `match:patch` event).

Example patch format:
```json
{
  "type": "PATCH",
  "operations": [
    { "op": "replace", "path": "/round/you/totalVisible", "value": 15 },
    { "op": "replace", "path": "/round/activePlayerId", "value": "p2" }
  ]
}
```
**Estimated savings:** 40-50ms (reduce average payload from 15KB to 2-3KB)

---

### 3.3 Connection Pooling for Nginx
**Current:** Each connection starts fresh.
**Fix:** Configure persistent connections and reduced latency buffers.

```nginx
upstream game_cluster {
  ip_hash;
  server game-node-1:4000;
  server game-node-2:4000;
  keepalive 64;
  keepalive_requests 1000;
  keepalive_timeout 60s;
}

server {
  location / {
    proxy_pass http://game_cluster;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    
    # Reduce buffering for real-time updates
    proxy_buffering off;
    proxy_request_buffering off;
  }
}
```
**Estimated savings:** 20-30ms (eliminate connection setup per request)

---

## Priority 4: Caching & State Management (Estimated 50-100ms latency reduction)

### 4.1 Client-Side State Caching
**Current:** No local state cache; always queries server.
**Fix:** Use IndexedDB for session state.

```typescript
// In lib/cache.ts
export async function cacheMatchView(view: MatchView): Promise<void> {
  const db = await openDB("cardclash", 1, {
    upgrade(db) {
      db.createObjectStore("views", { keyPath: "matchId" });
    }
  });
  await db.put("views", view);
}

export async function getCachedMatchView(matchId: string): Promise<MatchView | null> {
  const db = await openDB("cardclash", 1);
  return (await db.get("views", matchId)) || null;
}
```

**Usage in UI:**
```typescript
const [matchView, setMatchView] = useState<MatchView | null>(null);
const [isStale, setIsStale] = useState(false);

useEffect(() => {
  // Load from cache immediately
  getCachedMatchView(matchId).then(cached => {
    if (cached) {
      setMatchView(cached);
      setIsStale(true); // Mark for refresh
    }
  });
  
  // Meanwhile, fetch fresh data
  apiGetMatchState(matchId, playerId).then(fresh => {
    setMatchView(fresh);
    cacheMatchView(fresh);
    setIsStale(false);
  });
}, [matchId]);
```
**Estimated savings:** 100-200ms (instant local render + background sync)

---

### 4.2 Redis Memory Optimization
**Current:** Full match state stored per key.
**Fix:** Split hot/cold data; use Redis expiration aggressively.

```typescript
// In store.ts, separate cache layers:
const MATCH_TTL = 3600; // 1 hour
const MATCH_COLD_TTL = 86400; // 24 hours

export async function saveRecord(record: MatchRecord): Promise<void> {
  const multi = redis.multi();
  
  // Hot layer: Active match data (5-minute TTL for in-progress)
  if (record.match.status === "IN_PROGRESS") {
    multi.set(MATCH_KEY(record.match.id), JSON.stringify(record.match), "EX", 300);
  } else {
    multi.set(MATCH_KEY(record.match.id), JSON.stringify(record.match), "EX", MATCH_TTL);
  }
  
  // Cold layer: Archive finished matches after 1 hour
  if (record.match.status === "FINISHED") {
    multi.zadd("matches:finished", Date.now(), record.match.id);
    multi.set(
      `${MATCH_KEY(record.match.id)}:archive`,
      JSON.stringify(record.match),
      "EX",
      MATCH_COLD_TTL
    );
  }
  
  await multi.exec();
}
```
**Estimated savings:** 5-10ms per operation (smaller dataset, faster serialization)

---

## Priority 5: Monitoring & Metrics (Foundation for ongoing optimization)

### 5.1 Add Latency Instrumentation
```typescript
// In server.ts
interface LatencyMetric {
  endpoint: string;
  method: string;
  duration: number;
  timestamp: number;
}

const metrics: LatencyMetric[] = [];

app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    metrics.push({
      endpoint: req.path,
      method: req.method,
      duration,
      timestamp: Date.now()
    });
    
    // Log slow requests
    if (duration > 100) {
      console.warn(`[SLOW] ${req.method} ${req.path}: ${duration}ms`);
    }
  });
  next();
});

app.get("/metrics/latency", (req, res) => {
  const last100 = metrics.slice(-100);
  const avg = last100.reduce((sum, m) => sum + m.duration, 0) / last100.length;
  const p95 = last100.sort((a, b) => a.duration - b.duration)[Math.floor(last100.length * 0.95)];
  res.json({ avg, p95, samples: last100 });
});
```

### 5.2 Frontend Performance Monitoring
```typescript
// In frontend
import { PerformanceObserver } from "web-vitals";

export function initPerformanceMonitoring() {
  // Track WebSocket latency
  socket.on("match:state", (data) => {
    const latency = Date.now() - (data.serverTime || Date.now());
    console.log(`[WS Latency] ${latency}ms`);
  });
  
  // Track rendering performance
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      console.log(`[Paint] ${entry.name}: ${entry.duration}ms`);
    }
  });
  observer.observe({ entryTypes: ["paint", "measure"] });
}
```

---

## Implementation Roadmap

| Priority | Task | Est. Savings | Difficulty | Time |
|----------|------|-------------|-----------|------|
| 1 | Reduce Redis round-trips | 50-100ms | Medium | 2h |
| 1 | Optimize viewForPlayer() caching | 30-50ms | Low | 1h |
| 1 | Bot worker pool | 2-5ms | Low | 30m |
| 2 | Code splitting | 50-100ms | Low | 1h |
| 2 | Socket.IO tuning | 10-20ms | Low | 30m |
| 3 | Gzip compression | 30-50ms | Low | 30m |
| 3 | Differential updates | 40-50ms | High | 3h |
| 4 | Client-side caching | 100-200ms | Medium | 2h |
| 5 | Monitoring setup | Baseline | Low | 1h |

**Total potential latency reduction: 350-650ms (25-50% improvement)**

---

## Testing Methodology

1. Baseline metrics: `npm run dev` + Chrome DevTools Network/Performance tabs
2. Measure per-command latency: instrument `processNextCommand()` with timers
3. Load test: `ab -n 1000 -c 10 http://localhost:4000/health`
4. Monitor Redis: `redis-cli INFO stats` (commands/sec, latency percentiles)
5. Client-side: WebPageTest or Lighthouse on production build

