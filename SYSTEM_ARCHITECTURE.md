# Card Clash 21 - System Architecture

## Overview

Card Clash 21 is a real-time multiplayer turn-based card game where players compete to reach exactly 21 points without going over (busting). This document outlines the complete backend architecture required to support the game.

---

## Table of Contents

1. [Technology Stack](#technology-stack)
2. [System Architecture](#system-architecture)
3. [Data Models](#data-models)
4. [API Endpoints](#api-endpoints)
5. [WebSocket Events](#websocket-events)
6. [Game Logic & Rules](#game-logic--rules)
7. [Matchmaking System](#matchmaking-system)
8. [State Management](#state-management)
9. [Scalability Considerations](#scalability-considerations)

---

## Technology Stack

### Recommended Backend Stack

```
Backend Framework: Node.js + Express OR Python + FastAPI
Real-time Communication: Socket.IO OR WebSockets
Database: Redis (for session/game state) + PostgreSQL (optional, for analytics)
Message Queue: Redis Pub/Sub OR RabbitMQ (for matchmaking)
Deployment: Docker + Kubernetes OR AWS ECS
```

### Alternative Stack Options

- **Java/Kotlin**: Spring Boot + WebFlux
- **Go**: Gin + Gorilla WebSocket
- **.NET**: ASP.NET Core + SignalR

---

## System Architecture

### High-Level Architecture Diagram

```
┌─────────────────┐
│   Web Browser   │
│   (React SPA)   │
└────────┬────────┘
         │
         │ HTTP/WS
         │
┌────────▼────────────────────────────────────────┐
│          Load Balancer (NGINX/ALB)              │
└────────┬────────────────────────────────────────┘
         │
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼────┐
│ API   │ │ API   │  (Multiple instances)
│Server │ │Server │
│  #1   │ │  #2   │
└───┬───┘ └──┬────┘
    │        │
    └────┬───┘
         │
    ┌────▼──────────────────────────┐
    │  Redis (Session & Game State) │
    └───────────────────────────────┘
         │
    ┌────▼──────────────────────────┐
    │  PostgreSQL (Optional Stats)  │
    └───────────────────────────────┘
```

### Component Breakdown

#### 1. **API Server**
- Handles HTTP REST requests
- Manages WebSocket connections
- Validates game moves
- Enforces game rules
- Manages player sessions

#### 2. **Redis**
- Stores active game sessions
- Manages matchmaking queue
- Handles pub/sub for real-time events
- Stores temporary player data (name, session)

#### 3. **PostgreSQL** (Optional)
- Analytics and metrics
- Game history
- Error logging

#### 4. **WebSocket Server**
- Real-time bidirectional communication
- Game state updates
- Turn notifications
- Player actions

---

## Data Models

### 1. Player Session

```typescript
interface PlayerSession {
  sessionId: string;          // Unique session identifier
  playerName: string;         // Display name entered by player
  socketId: string;           // WebSocket connection ID
  status: 'idle' | 'queued' | 'in-game';
  gameId?: string;            // Current game ID (if in game)
  createdAt: number;          // Timestamp
  lastActivity: number;       // Timestamp for timeout detection
}
```

**Redis Key**: `session:{sessionId}`

---

### 2. Matchmaking Queue

```typescript
interface QueueEntry {
  sessionId: string;
  playerName: string;
  queuedAt: number;           // Timestamp when queued
  socketId: string;
}
```

**Redis Key**: `queue:matchmaking` (List/Set structure)

---

### 3. Game State

```typescript
interface GameState {
  gameId: string;
  players: {
    player1: PlayerGameData;
    player2: PlayerGameData;
  };
  currentTurn: 'player1' | 'player2';
  targetNumber: 21;           // Always 21 for this game
  status: 'waiting' | 'active' | 'finished';
  winner?: 'player1' | 'player2' | 'draw';
  actionLog: GameAction[];
  createdAt: number;
  updatedAt: number;
}

interface PlayerGameData {
  sessionId: string;
  playerName: string;
  socketId: string;
  lives: number;              // Default: 3
  cards: Card[];
  totalValue: number;
  hasStood: boolean;
  powerUps: PowerUp[];
}

interface Card {
  id: string;
  value: number;              // 1-10
  visible: boolean;           // Visible to opponent?
}

interface PowerUp {
  id: string;
  type: 'remove_opponent_card' | 'remove_own_card' | 'swap_card' | 'target_override';
  used: boolean;
}

interface GameAction {
  playerId: 'player1' | 'player2';
  action: 'draw' | 'stand' | 'use_powerup' | 'bust' | 'win';
  timestamp: number;
  details: any;
}
```

**Redis Key**: `game:{gameId}`

---

### 4. Card Deck

```typescript
// Static deck configuration
const CARD_DECK = {
  minValue: 1,
  maxValue: 10,
  // Cards are generated randomly when drawn
};
```

---

## API Endpoints

### REST API Endpoints

#### 1. **Player Session Management**

```http
POST /api/session/create
Request Body:
{
  "playerName": "string (2-20 chars)"
}

Response:
{
  "sessionId": "uuid",
  "playerName": "string",
  "status": "idle"
}
```

---

#### 2. **Matchmaking**

```http
POST /api/matchmaking/join
Request Body:
{
  "sessionId": "uuid"
}

Response:
{
  "status": "queued",
  "queuePosition": number,
  "estimatedWaitTime": number (seconds)
}
```

```http
POST /api/matchmaking/leave
Request Body:
{
  "sessionId": "uuid"
}

Response:
{
  "status": "removed"
}
```

---

#### 3. **Game Status**

```http
GET /api/game/:gameId
Headers:
  X-Session-ID: uuid

Response:
{
  "gameId": "uuid",
  "status": "active",
  "currentTurn": "player1",
  "myCards": Card[],
  "myTotal": number,
  "opponentCards": Card[] (only visible cards),
  "opponentTotal": number (only visible cards),
  "actionLog": GameAction[]
}
```

---

## WebSocket Events

### Client → Server Events

#### 1. **Connect**
```typescript
event: 'connect'
data: {
  sessionId: string
}
```

#### 2. **Join Queue**
```typescript
event: 'queue:join'
data: {
  sessionId: string
}
```

#### 3. **Leave Queue**
```typescript
event: 'queue:leave'
data: {
  sessionId: string
}
```

#### 4. **Game Actions**

```typescript
event: 'game:draw'
data: {
  gameId: string,
  sessionId: string
}

event: 'game:stand'
data: {
  gameId: string,
  sessionId: string
}

event: 'game:use_powerup'
data: {
  gameId: string,
  sessionId: string,
  powerUpId: string,
  targetCardId?: string
}
```

---

### Server → Client Events

#### 1. **Queue Status Updates**
```typescript
event: 'queue:status'
data: {
  status: 'queued' | 'searching',
  playersInQueue: number
}
```

#### 2. **Match Found**
```typescript
event: 'match:found'
data: {
  gameId: string,
  opponentName: string,
  yourTurn: boolean
}
```

#### 3. **Game State Updates**
```typescript
event: 'game:state_update'
data: {
  gameId: string,
  currentTurn: 'player1' | 'player2',
  myCards: Card[],
  myTotal: number,
  myLives: number,
  opponentCards: Card[] (filtered - only visible),
  opponentVisibleTotal: number,
  opponentLives: number,
  actionLog: GameAction[]
}
```

#### 4. **Turn Notification**
```typescript
event: 'game:your_turn'
data: {
  gameId: string
}
```

#### 5. **Opponent Action**
```typescript
event: 'game:opponent_action'
data: {
  action: 'draw' | 'stand' | 'use_powerup',
  details: any
}
```

#### 6. **Game Over**
```typescript
event: 'game:over'
data: {
  gameId: string,
  winner: 'you' | 'opponent' | 'draw',
  reason: 'bust' | 'stand' | 'surrender',
  finalScores: {
    you: number,
    opponent: number
  }
}
```

#### 7. **Player Disconnected**
```typescript
event: 'game:opponent_disconnected'
data: {
  gameId: string,
  waitingForReconnect: boolean,
  timeoutSeconds: 30
}
```

#### 8. **Error Events**
```typescript
event: 'error'
data: {
  code: string,
  message: string
}
```

---

## Game Logic & Rules

### Core Game Rules

1. **Objective**: Reach exactly 21 points or get closer than opponent without going over (busting)

2. **Starting Conditions**:
   - Each player starts with 3 lives
   - Each player draws 2 cards initially
   - Target number is 21
   - Turn order is random

3. **Turn Actions**:
   - **Draw**: Draw a random card (1-10 value)
   - **Stand**: End turn and lock score
   - **Use Power-Up**: Activate special ability

4. **Winning Conditions**:
   - Reach exactly 21
   - Have higher score than opponent when both stand (without busting)
   - Opponent busts
   - Opponent runs out of lives

5. **Losing Conditions**:
   - Total exceeds 21 (bust) → lose 1 life
   - Lower score than opponent when both stand
   - Run out of lives (0 lives remaining)

6. **Power-Ups** (Optional):
   - Remove Opponent Card
   - Remove Own Card
   - Swap Card
   - Target Override (change target to 19 or 23 for one round)

### Game Flow State Machine

```
WAITING → ACTIVE → FINISHED

States:
- WAITING: Waiting for both players to connect
- ACTIVE: Game in progress
- FINISHED: Game ended (winner determined)

Transitions:
WAITING → ACTIVE: Both players connected
ACTIVE → FINISHED: Win condition met
ACTIVE → FINISHED: Timeout/Disconnect
```

### Turn Logic Algorithm

```typescript
function processTurn(gameState: GameState, action: GameAction): GameState {
  // 1. Validate it's player's turn
  if (!isPlayerTurn(gameState, action.playerId)) {
    throw new Error('Not your turn');
  }

  // 2. Process action
  switch(action.action) {
    case 'draw':
      const newCard = drawRandomCard();
      addCardToPlayer(gameState, action.playerId, newCard);
      
      // Check for bust
      if (getPlayerTotal(gameState, action.playerId) > 21) {
        handleBust(gameState, action.playerId);
      }
      break;

    case 'stand':
      setPlayerStand(gameState, action.playerId);
      
      // If both players stood, determine winner
      if (bothPlayersStood(gameState)) {
        determineWinner(gameState);
      }
      break;

    case 'use_powerup':
      applyPowerUp(gameState, action.playerId, action.powerUpId);
      break;
  }

  // 3. Switch turn
  switchTurn(gameState);

  // 4. Log action
  gameState.actionLog.push(action);

  return gameState;
}
```

---

## Matchmaking System

### Simple FIFO Queue Algorithm

```typescript
class MatchmakingQueue {
  private queue: QueueEntry[] = [];

  async addPlayer(player: QueueEntry): Promise<void> {
    this.queue.push(player);
    await this.tryMatchPlayers();
  }

  async tryMatchPlayers(): Promise<void> {
    while (this.queue.length >= 2) {
      const player1 = this.queue.shift()!;
      const player2 = this.queue.shift()!;

      // Create game
      const game = await createGame(player1, player2);

      // Notify both players
      notifyMatchFound(player1, player2, game.gameId);
    }
  }

  removePlayer(sessionId: string): void {
    this.queue = this.queue.filter(p => p.sessionId !== sessionId);
  }

  getQueueSize(): number {
    return this.queue.length;
  }
}
```

### Redis Implementation

```typescript
// Add to queue
await redis.rpush('queue:matchmaking', JSON.stringify(queueEntry));

// Pop two players
const player1 = await redis.lpop('queue:matchmaking');
const player2 = await redis.lpop('queue:matchmaking');

// Queue size
const queueSize = await redis.llen('queue:matchmaking');
```

---

## State Management

### Session State (Redis)

```typescript
// Create session
await redis.setex(
  `session:${sessionId}`,
  3600, // 1 hour TTL
  JSON.stringify(playerSession)
);

// Get session
const session = JSON.parse(
  await redis.get(`session:${sessionId}`)
);

// Update session
await redis.setex(
  `session:${sessionId}`,
  3600,
  JSON.stringify(updatedSession)
);

// Delete session (on disconnect)
await redis.del(`session:${sessionId}`);
```

### Game State (Redis)

```typescript
// Create game
await redis.setex(
  `game:${gameId}`,
  7200, // 2 hours TTL
  JSON.stringify(gameState)
);

// Get game
const game = JSON.parse(
  await redis.get(`game:${gameId}`)
);

// Update game state
await redis.setex(
  `game:${gameId}`,
  7200,
  JSON.stringify(updatedGameState)
);

// Pub/Sub for real-time updates
await redis.publish(
  `game:${gameId}:updates`,
  JSON.stringify(stateUpdate)
);
```

---

## Scalability Considerations

### 1. **Horizontal Scaling**

- Use **sticky sessions** or **session affinity** at load balancer
- Store all state in Redis (stateless API servers)
- Use Redis Pub/Sub for cross-server communication

### 2. **WebSocket Scaling**

```
Option 1: Sticky Sessions
- Route same sessionId to same server
- Use NGINX ip_hash or cookie-based routing

Option 2: Redis Adapter (Socket.IO)
- All servers share Redis pub/sub
- Broadcasts work across all instances
```

### 3. **Database Optimization**

```typescript
// Use Redis for hot data (active games)
// Use PostgreSQL for cold data (analytics)

// Redis TTL for auto-cleanup
await redis.expire(`game:${gameId}`, 7200);

// Batch writes to PostgreSQL
setInterval(() => {
  flushGameHistoryToPostgres();
}, 60000);
```

### 4. **Connection Limits**

- Each server: ~10,000 concurrent WebSocket connections
- Use multiple servers behind load balancer
- Monitor connection count per server

### 5. **Rate Limiting**

```typescript
// Limit actions per player
const rateLimit = {
  draw: 1, // per second
  stand: 1, // per game
  powerup: 3 // per game
};
```

---

## Error Handling

### Common Error Scenarios

1. **Player Disconnect**
   - Grace period: 30 seconds
   - Auto-forfeit if not reconnected
   - Return to matchmaking for opponent

2. **Invalid Moves**
   - Validate turn ownership
   - Validate action legality
   - Return error to client

3. **Session Timeout**
   - Clear from queue
   - End active games
   - Clean up Redis data

4. **Server Crash**
   - Redis persists state
   - Players reconnect via sessionId
   - Resume game from last state

---

## Security Considerations

1. **Session Validation**
   ```typescript
   // Verify sessionId on every request
   if (!await redis.exists(`session:${sessionId}`)) {
     throw new Error('Invalid session');
   }
   ```

2. **Anti-Cheat**
   ```typescript
   // Server-side validation of all moves
   // Never trust client calculations
   // Regenerate card values server-side
   ```

3. **Rate Limiting**
   ```typescript
   // Prevent spam/DDoS
   // Limit actions per IP/session
   ```

4. **Input Validation**
   ```typescript
   // Sanitize playerName
   // Validate all action payloads
   ```

---

## Monitoring & Analytics

### Key Metrics to Track

```typescript
metrics = {
  // Performance
  activeGames: number,
  activeSessions: number,
  queueSize: number,
  avgMatchmakingTime: number,
  
  // Game Stats
  gamesPlayed: number,
  avgGameDuration: number,
  winRate: { player1: number, player2: number },
  bustRate: number,
  
  // System Health
  wsConnections: number,
  redisLatency: number,
  errorRate: number,
  serverCPU: number,
  serverMemory: number
}
```

---

## Database Schema (Optional - PostgreSQL)

### For Analytics & Game History

```sql
-- Games table
CREATE TABLE games (
  id UUID PRIMARY KEY,
  player1_name VARCHAR(20),
  player2_name VARCHAR(20),
  winner VARCHAR(10), -- 'player1', 'player2', 'draw'
  game_duration_seconds INT,
  player1_final_score INT,
  player2_final_score INT,
  created_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP
);

-- Game actions log
CREATE TABLE game_actions (
  id SERIAL PRIMARY KEY,
  game_id UUID REFERENCES games(id),
  player_id VARCHAR(10),
  action_type VARCHAR(20),
  action_details JSONB,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_games_created_at ON games(created_at);
CREATE INDEX idx_game_actions_game_id ON game_actions(game_id);
```

---

## Deployment Checklist

### Pre-Production

- [ ] Set up Redis cluster (primary + replica)
- [ ] Configure WebSocket sticky sessions
- [ ] Set up monitoring (Prometheus/Grafana)
- [ ] Configure rate limiting
- [ ] Set up error tracking (Sentry)
- [ ] Load testing (Artillery/k6)
- [ ] Security audit
- [ ] Backup strategy for Redis

### Environment Variables

```env
# Server
PORT=3000
NODE_ENV=production

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=secret

# PostgreSQL (optional)
DATABASE_URL=postgresql://user:pass@host:5432/db

# Game Config
TARGET_NUMBER=21
STARTING_LIVES=3
CARD_MIN_VALUE=1
CARD_MAX_VALUE=10
MATCHMAKING_TIMEOUT=60000
GAME_TIMEOUT=1800000
DISCONNECT_GRACE_PERIOD=30000

# Security
SESSION_TTL=3600
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## API Implementation Example (Node.js + Express + Socket.IO)

### Server Setup

```typescript
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import Redis from 'ioredis';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' }
});

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379')
});

// REST endpoints
app.post('/api/session/create', createSession);
app.post('/api/matchmaking/join', joinMatchmaking);
app.get('/api/game/:gameId', getGameState);

// WebSocket handlers
io.on('connection', (socket) => {
  socket.on('queue:join', handleQueueJoin);
  socket.on('game:draw', handleDrawCard);
  socket.on('game:stand', handleStand);
  socket.on('disconnect', handleDisconnect);
});

httpServer.listen(3000);
```

---

## Frontend Integration Points

### 1. Initialize Session

```typescript
// On app load
const response = await fetch('/api/session/create', {
  method: 'POST',
  body: JSON.stringify({ playerName })
});
const { sessionId } = await response.json();
localStorage.setItem('sessionId', sessionId);
```

### 2. Connect WebSocket

```typescript
import io from 'socket.io-client';

const socket = io('ws://localhost:3000', {
  query: { sessionId }
});

socket.on('match:found', (data) => {
  navigate('/match-found');
});

socket.on('game:state_update', (data) => {
  updateGameState(data);
});
```

### 3. Join Queue

```typescript
socket.emit('queue:join', { sessionId });
```

### 4. Send Game Actions

```typescript
// Draw card
socket.emit('game:draw', { gameId, sessionId });

// Stand
socket.emit('game:stand', { gameId, sessionId });

// Use power-up
socket.emit('game:use_powerup', {
  gameId,
  sessionId,
  powerUpId
});
```

---

## Testing Strategy

### Unit Tests
- Game logic functions
- Card drawing randomness
- Win/lose conditions
- Power-up effects

### Integration Tests
- API endpoints
- WebSocket events
- Matchmaking queue
- Session management

### Load Tests
- Concurrent games
- Matchmaking under load
- WebSocket connection limits
- Redis performance

---

## Summary

This architecture provides:

✅ **Real-time multiplayer** via WebSockets  
✅ **Scalable** with Redis and stateless servers  
✅ **Anonymous sessions** (no accounts)  
✅ **Fast matchmaking** with FIFO queue  
✅ **Game state persistence** in Redis  
✅ **Optional analytics** with PostgreSQL  
✅ **Production-ready** error handling and monitoring  

The system can handle **thousands of concurrent games** with proper horizontal scaling and Redis clustering.
