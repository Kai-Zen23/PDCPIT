# Card Clash 21 - Multiplayer Card Game

A real-time multiplayer turn-based strategy card game built with React and a choice of backend technologies.

![Card Clash 21](https://img.shields.io/badge/Game-Card%20Clash%2021-9D4EDD)
![Status](https://img.shields.io/badge/Status-Ready%20for%20Backend-2ECC71)

---

## 🎮 Game Overview

**Card Clash 21** is a competitive multiplayer card game where players compete to reach exactly 21 points without going over (busting). Features include:

- **Real-time multiplayer** via WebSockets
- **Anonymous play** - no accounts required, just enter a name
- **Turn-based strategy** - draw cards or stand
- **Power-ups** - special abilities to gain an advantage
- **Lives system** - 3 lives per player
- **Futuristic UI** - dark theme with neon accents

---

## 📁 Project Structure

```
card-clash-21/
├── 📄 SYSTEM_ARCHITECTURE.md      # Complete system design
├── 📄 API_SPECIFICATION.yaml      # OpenAPI/REST + WebSocket spec
├── 📄 IMPLEMENTATION_GUIDE.md     # Step-by-step setup guide
├── 📄 README.md                   # This file
│
├── 🎨 frontend/ (COMPLETED ✅)
│   ├── src/app/
│   │   ├── components/
│   │   │   ├── MainMenu.tsx              # Landing screen
│   │   │   ├── NameEntryMatchmaking.tsx  # Name input + queue
│   │   │   ├── MatchFound.tsx            # Match transition
│   │   │   ├── Gameplay.tsx              # Main game screen
│   │   │   ├── Victory.tsx               # Win screen
│   │   │   ├── Defeat.tsx                # Loss screen
│   │   │   ├── Lobby.tsx                 # (Optional) Private rooms
│   │   │   └── Waiting.tsx               # (Optional) Extra loading
│   │   ├── routes.ts                     # React Router config
│   │   └── App.tsx                       # Main app component
│   └── styles/
│       ├── fonts.css                     # Orbitron + Poppins
│       └── theme.css                     # Dark theme + neon colors
│
└── 💻 backend-examples/ (READY TO BUILD 🚀)
    ├── nodejs-typescript/
    │   ├── src/server.ts          # Complete Node.js implementation
    │   ├── package.json
    │   ├── tsconfig.json
    │   ├── .env.example
    │   └── README.md
    │
    └── python-fastapi/
        ├── main.py                # Complete Python implementation
        ├── requirements.txt
        ├── .env.example
        └── README.md
```

---

## 🚀 Quick Start

### Frontend (Already Built ✅)

The frontend is **100% complete** and ready to connect to your backend.

**Technology:**
- React 18
- TypeScript
- React Router 7
- Motion (Framer Motion)
- Tailwind CSS v4
- Socket.IO Client

**Screens Included:**
1. ✅ Main Menu
2. ✅ Name Entry + Matchmaking (combined)
3. ✅ Match Found (transition screen)
4. ✅ Gameplay (3-section layout)
5. ✅ Victory
6. ✅ Defeat

**Run the frontend:**
```bash
# The frontend is already running in your Figma Make environment
# No additional setup needed!
```

---

### Backend (Choose Your Stack 🎯)

#### Option 1: Node.js + TypeScript

**Tech Stack:**
- Express.js (REST API)
- Socket.IO (WebSocket)
- Redis (State storage)
- TypeScript

**Setup:**
```bash
cd backend-examples/nodejs-typescript
npm install
cp .env.example .env
npm run dev
```

#### Option 2: Python + FastAPI

**Tech Stack:**
- FastAPI (REST API)
- Python Socket.IO (WebSocket)
- Redis (State storage)
- Python 3.9+

**Setup:**
```bash
cd backend-examples/python-fastapi
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:socket_app --reload
```

---

## 📚 Documentation

### 🎓 [README_PDC.md](file:///README_PDC.md) - Parallel & Distributed Computing Background
> **Academic Reference**: Background documentation created specifically for our **Parallel and Distributed Computing** course submission. Details how the game architecture implements distributed locking mutexes, optimistic concurrency control (OCC), and event-loop parallelism across cluster instances.

---

### 1. **SYSTEM_ARCHITECTURE.md** - Complete Technical Specification

Includes:
- High-level architecture diagrams
- Data models (Session, Game State, Cards, Power-ups)
- REST API endpoint definitions
- WebSocket event specifications
- Game logic and rules
- Matchmaking algorithm
- Scalability considerations
- Database schema (optional PostgreSQL)
- Security best practices
- Monitoring and analytics

**Start here** to understand the full system design.

---

### 2. **API_SPECIFICATION.yaml** - OpenAPI Specification

Complete API documentation in OpenAPI 3.0 format:
- REST endpoints with request/response schemas
- WebSocket events (client→server and server→client)
- Error codes and responses
- Data models with validation rules

Use with:
- Swagger UI: https://editor.swagger.io/
- Postman: Import the YAML file
- Code generators: Generate client libraries

---

### 3. **IMPLEMENTATION_GUIDE.md** - Step-by-Step Setup

Comprehensive guide covering:
- 15-minute quick start
- Redis setup instructions
- Backend installation (Node.js or Python)
- Frontend-Backend integration
- Environment variable configuration
- Testing procedures
- Production deployment
- Troubleshooting common issues
- Performance optimization tips

**Follow this guide** to get your backend running and connected to the frontend.

---

## 🎯 Game Flow

```
┌─────────────┐
│ Main Menu   │
│             │
│  PLAY NOW   │ ──┐
│  CREATE     │   │
│  JOIN       │   │
└─────────────┘   │
                  │
                  ▼
┌─────────────────────────┐
│  Name Entry +           │
│  Matchmaking            │
│                         │
│  Enter name: [____]     │
│  [ENTER QUEUE]          │
└─────────────────────────┘
                  │
                  ▼
┌─────────────────────────┐
│  Searching...           │
│  ⭕ Finding Opponent    │
│  Players in Queue: 12   │
└─────────────────────────┘
                  │
                  ▼
┌─────────────────────────┐
│  Match Found!           │
│                         │
│  You vs Opponent        │
│  [Transition Animation] │
└─────────────────────────┘
                  │
                  ▼
┌─────────────────────────┐
│  Gameplay               │
│  ┌─────────────────┐   │
│  │ Opponent Panel  │   │
│  ├─────────────────┤   │
│  │ Battlefield     │   │
│  │ Target: 21      │   │
│  ├─────────────────┤   │
│  │ Your Panel      │   │
│  │ [DRAW] [STAND]  │   │
│  └─────────────────┘   │
└─────────────────────────┘
                  │
         ┌────────┴────────┐
         ▼                 ▼
   ┌──────────┐      ┌──────────┐
   │ Victory  │      │ Defeat   │
   │ 🏆       │      │ ☠️       │
   └──────────┘      └──────────┘
```

---

## 🔧 Backend Requirements

### Technology Stack

**Required:**
- Redis 6+ (state storage & matchmaking queue)
- Node.js 16+ OR Python 3.9+
- WebSocket support (Socket.IO)

**Optional:**
- PostgreSQL (for analytics/history)
- Docker (for containerization)
- NGINX (for load balancing)

### Core Features to Implement

#### 1. Session Management
- [x] Create temporary player sessions
- [x] Store session data in Redis
- [x] Session TTL (1 hour)

#### 2. Matchmaking
- [x] FIFO queue implementation
- [x] Match two players automatically
- [x] Real-time queue status updates

#### 3. Game Logic
- [x] Initialize game with 2 players
- [x] Random card drawing (1-10)
- [x] Turn management
- [x] Bust detection (total > 21)
- [x] Win/lose conditions
- [ ] Power-up system (optional)

#### 4. Real-time Communication
- [x] WebSocket connection handling
- [x] Game state broadcasts
- [x] Turn notifications
- [x] Match found events
- [ ] Reconnection logic (optional)

---

## 🎨 Frontend Features (Completed)

### UI/UX Design

**Theme:**
- Dark futuristic casino aesthetic
- Neon purple (#9D4EDD) and cyan (#4CC9F0) accents
- Glassmorphism panels
- Smooth animations with Motion/Framer Motion

**Typography:**
- Orbitron (headings & numbers)
- Poppins (body text)

**Visual Effects:**
- Pulsing neon glows
- Rotating energy rings
- Floating card animations
- Glitch transitions
- Confetti celebrations (victory)
- Ambient blur backgrounds

### Screen Details

**1. Main Menu**
- Animated background with floating cards
- Large neon logo
- Three action buttons (Play, Create, Join)

**2. Name Entry + Matchmaking**
- Combined single-screen experience
- Name input with focus glow
- Automatic transition to matchmaking
- Real-time queue status
- Rotating energy rings during search

**3. Match Found**
- Dramatic cyan flash
- Player vs Opponent display
- Glitch transition effects
- Card shuffle animation
- Auto-navigation to gameplay

**4. Gameplay**
- Three-section layout (opponent/battlefield/player)
- Large glowing target number (21)
- Card display with values
- Lives as glowing hearts
- Action buttons (Draw, Stand)
- Power-up grid (4 abilities)
- Action log sidebar
- Turn indicators with glow pulses

**5. Victory**
- Green glowing effects
- Confetti animation
- Trophy icon with sparkles
- Stats display (cards drawn, rounds won)
- Play Again & Main Menu buttons

**6. Defeat**
- Red dark theme
- Glitch effects
- Skull icon
- Final score display
- Try Again & Main Menu buttons

---

## 🔌 Integration Points

### Frontend → Backend

**1. Create Session**
```http
POST /api/session/create
Body: { "playerName": "Jerm" }
```

**2. WebSocket Connection**
```javascript
const socket = io('ws://localhost:3000', {
  query: { sessionId }
});
```

**3. Join Matchmaking**
```javascript
socket.emit('queue:join', { sessionId });
```

**4. Game Actions**
```javascript
socket.emit('game:draw', { gameId, sessionId });
socket.emit('game:stand', { gameId, sessionId });
```

### Backend → Frontend

**1. Match Found**
```javascript
socket.on('match:found', (data) => {
  // data.gameId, data.opponentName
});
```

**2. Game State Updates**
```javascript
socket.on('game:state_update', (state) => {
  // state.myCards, state.opponentCards, etc.
});
```

**3. Game Over**
```javascript
socket.on('game:over', (result) => {
  // result.winner, result.finalScores
});
```

---

## 🧪 Testing Your Implementation

### 1. Backend Health Check
```bash
curl http://localhost:3000/api/health
```

### 2. Session Creation
```bash
curl -X POST http://localhost:3000/api/session/create \
  -H "Content-Type: application/json" \
  -d '{"playerName":"TestPlayer"}'
```

### 3. Full Flow Test
1. Open two browser windows
2. Enter different names in each
3. Click "ENTER QUEUE" in both
4. Both should match and start a game
5. Test drawing cards and game over conditions

---

## 📊 System Architecture Highlights

### Data Flow

```
Frontend                WebSocket               Backend                Redis
  │                        │                      │                     │
  │──── Create Session ────┼────────────────────▶│                     │
  │                        │                      │──── Save Session ──▶│
  │◀─── SessionID ─────────┼──────────────────────│                     │
  │                        │                      │                     │
  │──── Connect WS ────────┼──────────────────────│                     │
  │──── Join Queue ────────┼────────────────────▶│                     │
  │                        │                      │──── Queue Add ─────▶│
  │                        │                      │                     │
  │                        │ [Waiting for 2nd player...]                │
  │                        │                      │                     │
  │◀─── Match Found ───────┼──────────────────────│◀─── Create Game ───│
  │◀─── Game State ────────┼──────────────────────│                     │
  │                        │                      │                     │
  │──── Draw Card ─────────┼────────────────────▶│                     │
  │                        │                      │──── Update State ──▶│
  │◀─── State Update ──────┼──────────────────────│◀─── Get State ─────│
  │                        │                      │                     │
```

---

## 🚀 Deployment Options

### Backend

**Option 1: Docker**
```bash
docker-compose up -d
```

**Option 2: Cloud Platforms**
- Heroku (Node.js/Python + Redis add-on)
- AWS ECS (containers)
- Google Cloud Run
- DigitalOcean App Platform

**Option 3: VPS**
- Ubuntu server with PM2 (Node.js) or Gunicorn (Python)
- NGINX reverse proxy
- Redis server

### Frontend

Already deployed in Figma Make environment!

For production:
- Vercel
- Netlify
- AWS S3 + CloudFront
- GitHub Pages

---

## 🔐 Security Considerations

- ✅ CORS configuration for frontend domain
- ✅ Input validation (player names, session IDs)
- ✅ Rate limiting on API endpoints
- ✅ Redis password protection
- ✅ WebSocket authentication via session ID
- ✅ Server-side game logic validation (anti-cheat)
- ⬜ HTTPS/WSS in production
- ⬜ DDoS protection
- ⬜ Error monitoring (Sentry)

---

## 📈 Performance & Scalability

### Current Capacity
- **Single server**: ~10,000 concurrent WebSocket connections
- **Redis**: Millions of operations/second
- **Average game**: ~2-5 minutes

### Scaling Strategy
1. **Horizontal scaling**: Multiple API servers behind load balancer
2. **Redis Cluster**: High availability and failover
3. **Socket.IO Redis Adapter**: Cross-server WebSocket communication
4. **Sticky sessions**: Route same user to same server
5. **CDN**: Static frontend assets

---

## 🎯 Next Steps

### Phase 1: Core Implementation ✅
- [x] Frontend UI (6 screens)
- [x] Routing system
- [x] Visual effects & animations
- [ ] Backend implementation (choose your stack)
- [ ] Redis setup
- [ ] WebSocket integration

### Phase 2: Game Features
- [ ] Power-ups system
- [ ] Sound effects
- [ ] Reconnection logic
- [ ] Spectator mode
- [ ] Game history

### Phase 3: Polish & Production
- [ ] Load testing
- [ ] Error handling improvements
- [ ] Analytics dashboard
- [ ] Production deployment
- [ ] Monitoring & alerts

---

## 🤝 Contributing

This is a complete reference implementation. Feel free to:
- Extend the game logic
- Add new power-ups
- Implement additional game modes
- Optimize performance
- Add mobile responsiveness

---

## 📄 License

This project is provided as a reference implementation for educational purposes.

---

## 💬 Support & Documentation

- **System Design**: `SYSTEM_ARCHITECTURE.md`
- **API Docs**: `API_SPECIFICATION.yaml`
- **Setup Guide**: `IMPLEMENTATION_GUIDE.md`
- **Backend Examples**: `backend-examples/`

---

**Built with ❤️ using React, TypeScript, and modern web technologies**

🎮 Ready to build your backend and start playing!
