# Backend Quick Reference - Card Clash 21

Quick cheat sheet for backend developers implementing Card Clash 21.

---

## 🎯 Core Responsibilities

Your backend must handle:
1. ✅ Session management (temporary player identities)
2. ✅ Matchmaking queue (FIFO pairing)
3. ✅ Game state management
4. ✅ Real-time communication (WebSocket)
5. ✅ Game logic validation

---

## 📡 API Endpoints

### REST API

```
POST   /api/session/create        # Create player session
POST   /api/matchmaking/join      # Join queue
POST   /api/matchmaking/leave     # Leave queue
GET    /api/game/:gameId          # Get game state
GET    /api/health                # Health check
```

### WebSocket Events

**Client → Server:**
```
queue:join              # Join matchmaking
queue:leave             # Leave matchmaking
game:draw               # Draw a card
game:stand              # Stand (lock score)
game:use_powerup        # Use power-up (optional)
```

**Server → Client:**
```
queue:status            # Queue status update
match:found             # Match found
game:state_update       # Game state changed
game:your_turn          # Your turn notification
game:opponent_action    # Opponent action
game:over               # Game ended
error                   # Error occurred
```

---

### Match Records (JSON)
Key: `match:{matchId}`
Type: `String (JSON)`
TTL: 3600 seconds (for finished games)

### Socket Mappings
Key: `sockets:{matchId}`
Type: `Hash`
Fields: `playerId -> socketId`

### Matchmaking Indices
Key: `matches:waiting` (Set of match IDs with 1 player)
Key: `matches:active` (Set of all in-progress match IDs)
```

---

## 🎮 Game Logic

### Card Drawing
```
value = random(1, 10)
visible = true
```

### Bust Detection
```
if totalValue > 21:
  lives -= 1
  if lives <= 0:
    game.winner = opponent
    game.status = "finished"
```

### Win Conditions
```
1. Opponent busts (total > 21)
2. Opponent runs out of lives
3. Both stand: higher score wins (without busting)
4. Exact 21: instant advantage
```

### Stand Logic
```
player.hasStood = true

if both_players_stood:
  determine_winner()
  game.status = "finished"
else:
  switch_turn()
```

---

## 🔄 Matchmaking Algorithm

```python
# Pseudo-code
def try_match_players():
  if queue.length >= 2:
    player1 = queue.pop_left()
    player2 = queue.pop_left()
    
    game = create_game(player1, player2)
    
    notify(player1, "match:found", {
      gameId: game.id,
      opponentName: player2.name,
      yourTurn: true
    })
    
    notify(player2, "match:found", {
      gameId: game.id,
      opponentName: player1.name,
      yourTurn: false
    })
```

---

## 🎯 Request/Response Examples

### 1. Create Session

**Request:**
```http
POST /api/session/create
Content-Type: application/json

{
  "playerName": "Jerm"
}
```

**Response:**
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "playerName": "Jerm",
  "status": "idle",
  "createdAt": 1672531200000
}
```

### 2. Join Queue (WebSocket)

**Client → Server:**
```javascript
socket.emit('queue:join', {
  sessionId: "550e8400-e29b-41d4-a716-446655440000"
});
```

**Server → Client:**
```javascript
socket.emit('queue:status', {
  status: "queued",
  playersInQueue: 5
});
```

### 3. Match Found (WebSocket)

**Server → Client:**
```javascript
socket.emit('match:found', {
  gameId: "a1b2c3d4-...",
  opponentName: "Shadow",
  yourTurn: true
});
```

### 4. Draw Card (WebSocket)

**Client → Server:**
```javascript
socket.emit('game:draw', {
  gameId: "a1b2c3d4-...",
  sessionId: "550e8400-..."
});
```

**Server → Client:**
```javascript
socket.emit('game:state_update', {
  gameId: "a1b2c3d4-...",
  currentTurn: "player2",
  myCards: [
    { id: "...", value: 7, visible: true },
    { id: "...", value: 4, visible: true },
    { id: "...", value: 9, visible: true }  // newly drawn
  ],
  myTotal: 20,
  myLives: 3,
  opponentCards: [
    { id: "...", value: 8, visible: true }
  ],
  opponentVisibleTotal: 8,
  opponentLives: 3,
  actionLog: [...]
});
```

### 5. Game Over (WebSocket)

**Server → Client:**
```javascript
socket.emit('game:over', {
  gameId: "a1b2c3d4-...",
  winner: "you",
  reason: "bust",
  finalScores: {
    you: 19,
    opponent: 24
  }
});
```

---

## ⚠️ Error Handling

### Common Error Codes

```javascript
{
  "INVALID_NAME": "Player name must be 2-20 characters",
  "SESSION_NOT_FOUND": "Session not found or expired",
  "GAME_NOT_FOUND": "Game not found",
  "NOT_YOUR_TURN": "It is not your turn",
  "NOT_IN_GAME": "You are not in this game",
  "ALREADY_STOOD": "You have already stood",
  "SERVER_ERROR": "Internal server error"
}
```

### Error Response Format

**REST API:**
```json
{
  "code": "SESSION_NOT_FOUND",
  "message": "Session not found or expired",
  "timestamp": 1672531200000
}
```

**WebSocket:**
```javascript
socket.emit('error', {
  code: "NOT_YOUR_TURN",
  message: "It is not your turn"
});
```

---

## 🔒 Validation Checklist

### Session Creation
- ✅ Player name 2-20 characters
- ✅ Trim whitespace
- ✅ Generate unique session ID
- ✅ Set TTL in Redis

### Game Actions
- ✅ Validate session exists
- ✅ Validate game exists
- ✅ Verify player is in game
- ✅ Check it's player's turn
- ✅ Check player hasn't stood
- ✅ Validate game is active

### Turn Management
- ✅ Only current player can act
- ✅ Switch turn after valid action
- ✅ Update action log
- ✅ Broadcast state to both players

---

## 🧪 Testing Commands

### Test with curl

```bash
# Create session
curl -X POST http://localhost:3000/api/session/create \
  -H "Content-Type: application/json" \
  -d '{"playerName":"TestPlayer"}'

# Join queue
curl -X POST http://localhost:3000/api/matchmaking/join \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"your-session-id"}'

# Health check
curl http://localhost:3000/api/health
```

### Test with Redis CLI

```bash
# Connect to Redis
redis-cli

# List all sessions
KEYS session:*

# Get session
GET session:550e8400-e29b-41d4-a716-446655440000

# Check queue
LRANGE queue:matchmaking 0 -1
LLEN queue:matchmaking

# List all games
KEYS game:*

# Get game
GET game:a1b2c3d4-e5f6-...
```

---

## 📊 State Transitions

### Session States
```
idle → queued → in-game → idle
```

### Game States
```
waiting → active → finished
```

### Turn Flow
```
player1 → player2 → player1 → player2 → ...
```

---

## 🚀 Performance Tips

### Redis Optimization
```javascript
// Use pipelining for multiple operations
const pipeline = redis.pipeline();
pipeline.get('session:123');
pipeline.get('game:456');
await pipeline.exec();

// Set TTL on all keys
redis.setex(key, ttl, value);

// Use hash sets for complex objects
redis.hset('game:123', 'status', 'active');
```

### WebSocket Optimization
```javascript
// Emit to specific room/socket, not broadcast
io.to(socketId).emit('event', data);

// Batch state updates
const updates = [...];
io.to(gameRoom).emit('batch_update', updates);

// Limit action log size
actionLog.slice(-10);  // Keep only last 10 actions
```

---

## 🐛 Common Issues

### Issue: Queue not matching
**Check:**
```bash
redis-cli LLEN queue:matchmaking
redis-cli LRANGE queue:matchmaking 0 -1
```

### Issue: Game state not updating
**Check:**
- WebSocket connection status
- Session ID in socket query params
- Redis TTL hasn't expired
- Turn validation logic

### Issue: Players can't reconnect
**Implement:**
- Store socketId separately
- Update socketId on reconnect
- Grace period before forfeit

---

## 📈 Metrics to Track

```javascript
{
  activeGames: number,
  activeSessions: number,
  queueSize: number,
  avgMatchmakingTime: ms,
  gamesPlayed: number,
  avgGameDuration: ms,
  wsConnections: number,
  redisLatency: ms,
  errorRate: number
}
```

---

## 🔧 Environment Variables

```env
# Server
PORT=3000
NODE_ENV=development

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Game Config
TARGET_NUMBER=21
STARTING_LIVES=3
SESSION_TTL=3600
GAME_TTL=7200

# Timeouts
DISCONNECT_GRACE_PERIOD=30000
MATCHMAKING_TIMEOUT=60000
```

---

## 📦 Dependencies

### Node.js
```json
{
  "express": "^4.18.2",
  "socket.io": "^4.6.1",
  "ioredis": "^5.3.1",
  "uuid": "^9.0.0",
  "cors": "^2.8.5"
}
```

### Python
```txt
fastapi==0.109.0
uvicorn==0.27.0
python-socketio==5.11.0
redis==5.0.1
pydantic==2.5.3
```

---

## 🎯 Implementation Checklist

- [ ] Set up Redis
- [ ] Create session endpoint
- [ ] WebSocket connection handling
- [ ] Matchmaking queue implementation
- [ ] Game creation logic
- [ ] Card drawing (random 1-10)
- [ ] Turn management
- [ ] Bust detection
- [ ] Win/lose conditions
- [ ] State broadcasting
- [ ] Error handling
- [ ] Testing
- [ ] Documentation

---

## 📞 Quick Help

**Can't connect to Redis?**
```bash
redis-cli ping
# Should return: PONG
```

**WebSocket not connecting?**
- Check CORS configuration
- Verify Socket.IO versions match (client/server)
- Check WebSocket URL (ws:// or wss://)

**Players not matching?**
- Clear Redis queue: `redis-cli DEL queue:matchmaking`
- Check matchmaking logic triggers on 2+ players

---

**Happy coding! 🚀**

For full details, see:
- `SYSTEM_ARCHITECTURE.md` - Complete technical spec
- `API_SPECIFICATION.yaml` - Full API documentation
- `IMPLEMENTATION_GUIDE.md` - Step-by-step setup
