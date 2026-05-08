# Card Clash 21 Backend - Python + FastAPI

## Prerequisites

- Python 3.9+
- Redis 6+
- pip or poetry

## Installation

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
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
uvicorn main:socket_app --reload --port 8000
```

Server will run on `http://localhost:8000`

API documentation available at `http://localhost:8000/docs`

## API Endpoints

- `POST /api/session/create` - Create player session
- `POST /api/matchmaking/join` - Join matchmaking queue
- `POST /api/matchmaking/leave` - Leave matchmaking queue
- `GET /api/health` - Health check
- `GET /docs` - Interactive API documentation (Swagger UI)

## WebSocket Events

### Client → Server
- `queue_join` - Join matchmaking
- `queue_leave` - Leave matchmaking
- `game_draw` - Draw a card
- `game_stand` - Stand (lock score)
- `game_use_powerup` - Use power-up

### Server → Client
- `queue:status` - Queue status update
- `match:found` - Match found
- `game:state_update` - Game state changed
- `game:your_turn` - Your turn notification
- `game:over` - Game finished
- `error` - Error occurred

## Testing

```bash
# Install pytest
pip install pytest pytest-asyncio httpx

# Run tests
pytest
```

## Production Deployment

```bash
# Install production server
pip install gunicorn

# Run with Gunicorn
gunicorn main:socket_app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

## Docker

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "main:socket_app", "--host", "0.0.0.0", "--port", "8000"]
```

Build and run:
```bash
docker build -t card-clash-21-backend .
docker run -p 8000:8000 --env-file .env card-clash-21-backend
```

## Architecture

- **FastAPI** - REST API framework
- **Socket.IO** - WebSocket communication
- **Redis** - Session & game state storage
- **Pydantic** - Data validation
- **Uvicorn** - ASGI server

## Features

✅ Async/await throughout  
✅ Type hints with Pydantic  
✅ Auto-generated API docs  
✅ Redis for state management  
✅ Socket.IO for real-time events  
✅ CORS enabled  

## Performance

FastAPI is one of the fastest Python frameworks:
- ~10,000+ requests/second
- Native async support
- Minimal overhead
