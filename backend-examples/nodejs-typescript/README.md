# Card Clash 21 Backend - Node.js + TypeScript

## Prerequisites

- Node.js 16+ 
- Redis 6+
- npm or yarn

## Installation

```bash
npm install
```

## Configuration

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Update environment variables in `.env`

## Running Locally

### Start Redis
```bash
# Using Docker
docker run -d -p 6379:6379 redis:alpine

# Or install Redis locally
# macOS: brew install redis && brew services start redis
# Ubuntu: sudo apt-get install redis-server && sudo service redis-server start
```

### Start Development Server
```bash
npm run dev
```

Server will run on `http://localhost:3000`

## API Endpoints

- `POST /api/session/create` - Create player session
- `POST /api/matchmaking/join` - Join matchmaking queue
- `POST /api/matchmaking/leave` - Leave matchmaking queue
- `GET /api/health` - Health check

## WebSocket Events

### Client → Server
- `queue:join` - Join matchmaking
- `queue:leave` - Leave matchmaking
- `game:draw` - Draw a card
- `game:stand` - Stand (lock score)
- `game:use_powerup` - Use power-up

### Server → Client
- `queue:status` - Queue status update
- `match:found` - Match found
- `game:state_update` - Game state changed
- `game:your_turn` - Your turn notification
- `game:over` - Game finished
- `error` - Error occurred

## Testing

```bash
npm test
```

## Building for Production

```bash
npm run build
npm start
```

## Docker

```bash
# Build image
docker build -t card-clash-21-backend .

# Run container
docker run -p 3000:3000 --env-file .env card-clash-21-backend
```

## Architecture

- **Express.js** - REST API
- **Socket.IO** - WebSocket communication
- **Redis** - Session & game state storage
- **TypeScript** - Type safety

## Scaling

For production deployment:

1. Use Redis Cluster for high availability
2. Deploy multiple API instances behind load balancer
3. Use Socket.IO Redis Adapter for cross-server communication
4. Enable sticky sessions at load balancer

Example with Socket.IO Redis Adapter:

```typescript
import { createAdapter } from "@socket.io/redis-adapter";
const pubClient = new Redis(REDIS_URL);
const subClient = pubClient.duplicate();
io.adapter(createAdapter(pubClient, subClient));
```

## Monitoring

Recommended tools:
- Prometheus + Grafana for metrics
- Sentry for error tracking
- Redis Insights for Redis monitoring
