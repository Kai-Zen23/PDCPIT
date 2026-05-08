# Card Clash 21 - Complete Implementation Guide

This guide provides step-by-step instructions for implementing the Card Clash 21 backend and connecting it to the frontend.

---

## 📁 Project Structure

```
card-clash-21/
├── frontend/                    # React + TypeScript (Already built)
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/
│   │   │   │   ├── MainMenu.tsx
│   │   │   │   ├── NameEntryMatchmaking.tsx
│   │   │   │   ├── MatchFound.tsx
│   │   │   │   ├── Gameplay.tsx
│   │   │   │   ├── Victory.tsx
│   │   │   │   └── Defeat.tsx
│   │   │   ├── routes.ts
│   │   │   └── App.tsx
│   │   └── styles/
│   └── package.json
│
├── backend/                     # Choose one implementation
│   ├── nodejs-typescript/       # Option 1: Node.js + TypeScript
│   │   ├── src/
│   │   │   └── server.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── .env
│   │
│   └── python-fastapi/          # Option 2: Python + FastAPI
│       ├── main.py
│       ├── requirements.txt
│       └── .env
│
├── SYSTEM_ARCHITECTURE.md       # System design documentation
├── API_SPECIFICATION.yaml       # OpenAPI spec
└── IMPLEMENTATION_GUIDE.md      # This file
```

---

## 🚀 Quick Start (15 minutes)

### Step 1: Set Up Redis

**Using Docker (Recommended)**
```bash
docker run -d -p 6379:6379 --name card-clash-redis redis:alpine
```

**Or Install Locally**
- macOS: `brew install redis && brew services start redis`
- Ubuntu: `sudo apt-get install redis-server && sudo service redis-server start`
- Windows: Download from https://redis.io/download

Verify Redis is running:
```bash
redis-cli ping
# Should return: PONG
```

---

### Step 2: Choose Backend Implementation

#### Option A: Node.js + TypeScript

```bash
cd backend-examples/nodejs-typescript

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start development server
npm run dev
```

Server runs on `http://localhost:3000`

#### Option B: Python + FastAPI

```bash
cd backend-examples/python-fastapi

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env

# Start development server
uvicorn main:socket_app --reload --port 8000
```

Server runs on `http://localhost:8000`

---

### Step 3: Update Frontend Configuration

Edit frontend configuration to point to your backend:

**File: `src/app/services/api.ts`** (create this file)

```typescript
// Backend API configuration
export const API_CONFIG = {
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000',
  wsURL: process.env.REACT_APP_WS_URL || 'ws://localhost:3000',
};

// API client
export async function createSession(playerName: string) {
  const response = await fetch(`${API_CONFIG.baseURL}/api/session/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerName }),
  });
  return response.json();
}

export async function joinMatchmaking(sessionId: string) {
  const response = await fetch(`${API_CONFIG.baseURL}/api/matchmaking/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  });
  return response.json();
}
```

**File: `src/app/services/socket.ts`** (create this file)

```typescript
import io from 'socket.io-client';
import { API_CONFIG } from './api';

export function createSocket(sessionId: string) {
  return io(API_CONFIG.wsURL, {
    query: { sessionId },
    transports: ['websocket'],
  });
}
```

---

### Step 4: Integrate Frontend with Backend

Update `NameEntryMatchmaking.tsx`:

```typescript
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { createSession, joinMatchmaking } from "../services/api";
import { createSocket } from "../services/socket";

export function NameEntryMatchmaking() {
  const navigate = useNavigate();
  const [playerName, setPlayerName] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [socket, setSocket] = useState(null);
  const [matchState, setMatchState] = useState("name-entry");

  const handleEnterQueue = async () => {
    if (playerName.trim().length < 2) return;

    // Create session
    const session = await createSession(playerName);
    setSessionId(session.sessionId);
    localStorage.setItem('sessionId', session.sessionId);

    // Connect socket
    const newSocket = createSocket(session.sessionId);
    setSocket(newSocket);

    // Listen for match found
    newSocket.on('match:found', (data) => {
      navigate('/match-found', { 
        state: { 
          playerName, 
          gameId: data.gameId,
          opponentName: data.opponentName 
        } 
      });
    });

    // Join queue
    await joinMatchmaking(session.sessionId);
    setMatchState("searching");
  };

  // ... rest of component
}
```

---

## 🎮 Frontend-Backend Integration Points

### 1. Session Creation

**Frontend → Backend**
```typescript
POST /api/session/create
Body: { "playerName": "Jerm" }

Response: {
  "sessionId": "uuid",
  "playerName": "Jerm",
  "status": "idle"
}
```

### 2. WebSocket Connection

**Frontend**
```typescript
import io from 'socket.io-client';

const socket = io('http://localhost:3000', {
  query: { sessionId: 'your-session-id' }
});
```

### 3. Matchmaking

**Frontend → Backend**
```typescript
// Join queue
socket.emit('queue:join', { sessionId });

// Listen for match
socket.on('match:found', (data) => {
  // data.gameId, data.opponentName, data.yourTurn
});
```

### 4. Game Actions

**Frontend → Backend**
```typescript
// Draw card
socket.emit('game:draw', { 
  gameId, 
  sessionId 
});

// Stand
socket.emit('game:stand', { 
  gameId, 
  sessionId 
});

// Listen for updates
socket.on('game:state_update', (state) => {
  // Update UI with new game state
});

socket.on('game:over', (result) => {
  // Navigate to victory/defeat screen
  if (result.winner === 'you') {
    navigate('/victory');
  } else {
    navigate('/defeat');
  }
});
```

---

## 🔧 Environment Variables

### Backend (.env)

```env
# Server
PORT=3000
NODE_ENV=development

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Game Config
TARGET_NUMBER=21
STARTING_LIVES=3
SESSION_TTL=3600
GAME_TTL=7200
```

### Frontend (.env)

```env
REACT_APP_API_URL=http://localhost:3000
REACT_APP_WS_URL=ws://localhost:3000
```

---

## 🧪 Testing the Integration

### 1. Test Session Creation

```bash
curl -X POST http://localhost:3000/api/session/create \
  -H "Content-Type: application/json" \
  -d '{"playerName":"TestPlayer"}'
```

Expected response:
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "playerName": "TestPlayer",
  "status": "idle",
  "createdAt": 1672531200000
}
```

### 2. Test Matchmaking

```bash
curl -X POST http://localhost:3000/api/matchmaking/join \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"your-session-id"}'
```

### 3. Test WebSocket Connection

**Using Browser Console:**
```javascript
// Load Socket.IO client
const script = document.createElement('script');
script.src = 'https://cdn.socket.io/4.6.0/socket.io.min.js';
document.head.appendChild(script);

// Connect
const socket = io('http://localhost:3000', {
  query: { sessionId: 'your-session-id' }
});

// Join queue
socket.emit('queue:join', { sessionId: 'your-session-id' });

// Listen for events
socket.on('match:found', (data) => console.log('Match found!', data));
socket.on('error', (err) => console.error('Error:', err));
```

### 4. Test Full Game Flow

**Open two browser windows side by side:**

1. Window 1: Enter name "Player1" → Join queue
2. Window 2: Enter name "Player2" → Join queue
3. Both windows should show "Match Found" transition
4. Both windows should load the Gameplay screen
5. Test drawing cards, standing, and game over conditions

---

## 📊 Monitoring & Debugging

### Check Redis Data

```bash
# Connect to Redis CLI
redis-cli

# List all sessions
KEYS session:*

# Get session data
GET session:550e8400-e29b-41d4-a716-446655440000

# List all games
KEYS game:*

# Check queue
LRANGE queue:matchmaking 0 -1

# Get queue size
LLEN queue:matchmaking
```

### Backend Logs

**Node.js:**
```bash
# Development mode shows detailed logs
npm run dev
```

**Python:**
```bash
# Uvicorn shows request logs
uvicorn main:socket_app --reload --log-level debug
```

### Frontend Console

Check browser console for:
- WebSocket connection status
- API request/response logs
- Game state updates
- Error messages

---

## 🚢 Production Deployment

### 1. Backend Deployment

**Using Docker Compose:**

```yaml
# docker-compose.yml
version: '3.8'

services:
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data

  backend:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - NODE_ENV=production
    depends_on:
      - redis

volumes:
  redis-data:
```

Run:
```bash
docker-compose up -d
```

### 2. Frontend Deployment

```bash
# Build for production
npm run build

# Deploy to Vercel, Netlify, or AWS S3
# Update environment variables to point to production backend
```

### 3. Environment Variables (Production)

**Backend:**
```env
NODE_ENV=production
PORT=3000
REDIS_HOST=your-redis-host
REDIS_PASSWORD=your-redis-password
CORS_ORIGIN=https://your-frontend-domain.com
```

**Frontend:**
```env
REACT_APP_API_URL=https://api.your-domain.com
REACT_APP_WS_URL=wss://api.your-domain.com
```

---

## 🔒 Security Checklist

- [ ] Enable CORS only for your frontend domain
- [ ] Use WSS (WebSocket Secure) in production
- [ ] Implement rate limiting on API endpoints
- [ ] Validate all user inputs server-side
- [ ] Set up Redis password protection
- [ ] Use HTTPS for all communications
- [ ] Implement session timeout and cleanup
- [ ] Add request/response logging
- [ ] Set up error monitoring (Sentry)

---

## 🐛 Common Issues & Solutions

### Issue: Cannot connect to Redis

**Solution:**
```bash
# Check if Redis is running
redis-cli ping

# Check Redis connection in code
# Node.js: Add error handler
redis.on('error', (err) => console.error('Redis error:', err));

# Python: Check connection
await redis.ping()
```

### Issue: WebSocket connection fails

**Solution:**
- Check CORS configuration
- Verify WebSocket URL (ws:// vs wss://)
- Check firewall/proxy settings
- Ensure backend is running

### Issue: Players not matching

**Solution:**
```bash
# Check queue in Redis
redis-cli
LRANGE queue:matchmaking 0 -1

# Clear queue if stuck
redis-cli
DEL queue:matchmaking
```

### Issue: Game state not updating

**Solution:**
- Check WebSocket connection in browser console
- Verify sessionId is being passed correctly
- Check backend logs for errors
- Ensure Redis TTL hasn't expired

---

## 📈 Performance Optimization

### Backend

1. **Use Redis Connection Pooling**
```typescript
const redis = new Redis({
  host: REDIS_HOST,
  port: REDIS_PORT,
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: false
});
```

2. **Enable Socket.IO Redis Adapter** (for multi-server scaling)
```typescript
import { createAdapter } from "@socket.io/redis-adapter";
io.adapter(createAdapter(pubClient, subClient));
```

3. **Implement Rate Limiting**
```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100 // limit each IP to 100 requests per minute
});

app.use('/api/', limiter);
```

### Frontend

1. **Memoize Components**
```typescript
import { memo } from 'react';
export const Card = memo(({ value }) => { ... });
```

2. **Debounce Socket Events**
```typescript
import { debounce } from 'lodash';
const debouncedEmit = debounce(socket.emit, 300);
```

---

## 📚 Additional Resources

- **System Architecture**: See `SYSTEM_ARCHITECTURE.md`
- **API Specification**: See `API_SPECIFICATION.yaml`
- **Socket.IO Docs**: https://socket.io/docs/
- **FastAPI Docs**: https://fastapi.tiangolo.com/
- **Redis Docs**: https://redis.io/documentation

---

## 🎯 Next Steps

1. ✅ Set up Redis
2. ✅ Choose and start backend (Node.js or Python)
3. ✅ Test backend API endpoints
4. ✅ Integrate frontend with backend
5. ✅ Test full game flow
6. ⬜ Add power-ups implementation
7. ⬜ Implement reconnection logic
8. ⬜ Add analytics and monitoring
9. ⬜ Deploy to production
10. ⬜ Load testing and optimization

---

## 💬 Support

For questions or issues:
1. Check the troubleshooting section
2. Review backend logs
3. Check Redis data
4. Test API endpoints with curl/Postman
5. Verify WebSocket connection in browser console

---

**Happy coding! 🚀**
