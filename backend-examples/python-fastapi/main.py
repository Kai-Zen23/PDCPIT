"""
Card Clash 21 - Backend Server Implementation (Python + FastAPI)

Tech Stack:
- FastAPI (REST API)
- Socket.IO (WebSocket)
- Redis (State management)
- Python 3.9+
"""

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Literal
import socketio
import redis.asyncio as redis
import json
import uuid
import random
from datetime import datetime, timedelta

# Configuration
REDIS_HOST = "localhost"
REDIS_PORT = 6379
TARGET_NUMBER = 21
STARTING_LIVES = 3
SESSION_TTL = 3600  # 1 hour
GAME_TTL = 7200  # 2 hours

# Initialize FastAPI
app = FastAPI(title="Card Clash 21 API", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Socket.IO
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*'
)
socket_app = socketio.ASGIApp(sio, app)

# Initialize Redis
redis_client = redis.Redis(
    host=REDIS_HOST,
    port=REDIS_PORT,
    decode_responses=True
)

# Pydantic Models
class CreateSessionRequest(BaseModel):
    playerName: str = Field(..., min_length=2, max_length=20)

class SessionResponse(BaseModel):
    sessionId: str
    playerName: str
    status: Literal['idle', 'queued', 'in-game']
    createdAt: int

class JoinQueueRequest(BaseModel):
    sessionId: str

class Card(BaseModel):
    id: str
    value: int
    visible: bool

class PowerUp(BaseModel):
    id: str
    type: Literal['remove_opponent_card', 'remove_own_card', 'swap_card', 'target_override']
    used: bool

class PlayerGameData(BaseModel):
    sessionId: str
    playerName: str
    socketId: str
    lives: int
    cards: List[Card]
    totalValue: int
    hasStood: bool
    powerUps: List[PowerUp]

class GameState(BaseModel):
    gameId: str
    players: dict  # player1 and player2
    currentTurn: Literal['player1', 'player2']
    targetNumber: int
    status: Literal['waiting', 'active', 'finished']
    winner: Optional[Literal['player1', 'player2', 'draw']] = None
    actionLog: List[dict]
    createdAt: int
    updatedAt: int

class PlayerSession(BaseModel):
    sessionId: str
    playerName: str
    socketId: str
    status: Literal['idle', 'queued', 'in-game']
    gameId: Optional[str] = None
    createdAt: int
    lastActivity: int

# Helper Functions
async def save_session(session: PlayerSession):
    """Save session to Redis with TTL"""
    await redis_client.setex(
        f"session:{session.sessionId}",
        SESSION_TTL,
        session.json()
    )

async def get_session(session_id: str) -> Optional[PlayerSession]:
    """Get session from Redis"""
    data = await redis_client.get(f"session:{session_id}")
    if data:
        return PlayerSession.parse_raw(data)
    return None

async def save_game(game: GameState):
    """Save game state to Redis with TTL"""
    await redis_client.setex(
        f"game:{game.gameId}",
        GAME_TTL,
        game.json()
    )

async def get_game(game_id: str) -> Optional[GameState]:
    """Get game from Redis"""
    data = await redis_client.get(f"game:{game_id}")
    if data:
        return GameState.parse_raw(data)
    return None

def draw_random_card() -> Card:
    """Generate a random card (1-10)"""
    return Card(
        id=str(uuid.uuid4()),
        value=random.randint(1, 10),
        visible=True
    )

def calculate_total(cards: List[Card]) -> int:
    """Calculate total value of cards"""
    return sum(card.value for card in cards)

async def create_game(session1: PlayerSession, session2: PlayerSession) -> str:
    """Create a new game between two players"""
    game_id = str(uuid.uuid4())

    # Initial cards
    player1_cards = [draw_random_card(), draw_random_card()]
    player2_cards = [draw_random_card(), draw_random_card()]

    game_state = GameState(
        gameId=game_id,
        players={
            "player1": PlayerGameData(
                sessionId=session1.sessionId,
                playerName=session1.playerName,
                socketId=session1.socketId,
                lives=STARTING_LIVES,
                cards=player1_cards,
                totalValue=calculate_total(player1_cards),
                hasStood=False,
                powerUps=[]
            ).dict(),
            "player2": PlayerGameData(
                sessionId=session2.sessionId,
                playerName=session2.playerName,
                socketId=session2.socketId,
                lives=STARTING_LIVES,
                cards=player2_cards,
                totalValue=calculate_total(player2_cards),
                hasStood=False,
                powerUps=[]
            ).dict()
        },
        currentTurn="player1",
        targetNumber=TARGET_NUMBER,
        status="active",
        actionLog=[
            {"action": "game_started", "timestamp": int(datetime.now().timestamp() * 1000)}
        ],
        createdAt=int(datetime.now().timestamp() * 1000),
        updatedAt=int(datetime.now().timestamp() * 1000)
    )

    await save_game(game_state)
    return game_id

def get_player_role(game: GameState, session_id: str) -> Optional[str]:
    """Determine player role (player1 or player2)"""
    if game.players["player1"]["sessionId"] == session_id:
        return "player1"
    if game.players["player2"]["sessionId"] == session_id:
        return "player2"
    return None

async def broadcast_game_state(game: GameState):
    """Send game state to both players"""
    player1_data = game.players["player1"]
    player2_data = game.players["player2"]

    # Filter opponent cards (only visible ones)
    player1_visible_cards = [c for c in player2_data["cards"] if c["visible"]]
    player2_visible_cards = [c for c in player1_data["cards"] if c["visible"]]

    # Player 1 state
    player1_state = {
        "gameId": game.gameId,
        "currentTurn": game.currentTurn,
        "myCards": player1_data["cards"],
        "myTotal": player1_data["totalValue"],
        "myLives": player1_data["lives"],
        "opponentCards": player1_visible_cards,
        "opponentVisibleTotal": sum(c["value"] for c in player1_visible_cards),
        "opponentLives": player2_data["lives"],
        "actionLog": game.actionLog[-10:]
    }

    # Player 2 state
    player2_state = {
        "gameId": game.gameId,
        "currentTurn": game.currentTurn,
        "myCards": player2_data["cards"],
        "myTotal": player2_data["totalValue"],
        "myLives": player2_data["lives"],
        "opponentCards": player2_visible_cards,
        "opponentVisibleTotal": sum(c["value"] for c in player2_visible_cards),
        "opponentLives": player1_data["lives"],
        "actionLog": game.actionLog[-10:]
    }

    await sio.emit('game:state_update', player1_state, room=player1_data["socketId"])
    await sio.emit('game:state_update', player2_state, room=player2_data["socketId"])

# Matchmaking Queue
class MatchmakingQueue:
    @staticmethod
    async def add_player(session_id: str):
        """Add player to matchmaking queue"""
        await redis_client.rpush('queue:matchmaking', session_id)
        await MatchmakingQueue.try_match_players()

    @staticmethod
    async def remove_player(session_id: str):
        """Remove player from matchmaking queue"""
        await redis_client.lrem('queue:matchmaking', 0, session_id)

    @staticmethod
    async def try_match_players():
        """Try to match two players from queue"""
        queue_size = await redis_client.llen('queue:matchmaking')

        if queue_size >= 2:
            session_id1 = await redis_client.lpop('queue:matchmaking')
            session_id2 = await redis_client.lpop('queue:matchmaking')

            if session_id1 and session_id2:
                session1 = await get_session(session_id1)
                session2 = await get_session(session_id2)

                if session1 and session2:
                    game_id = await create_game(session1, session2)

                    # Notify both players
                    await sio.emit('match:found', {
                        'gameId': game_id,
                        'opponentName': session2.playerName,
                        'yourTurn': True
                    }, room=session1.socketId)

                    await sio.emit('match:found', {
                        'gameId': game_id,
                        'opponentName': session1.playerName,
                        'yourTurn': False
                    }, room=session2.socketId)

                    # Update sessions
                    session1.status = 'in-game'
                    session1.gameId = game_id
                    session2.status = 'in-game'
                    session2.gameId = game_id

                    await save_session(session1)
                    await save_session(session2)

    @staticmethod
    async def get_queue_size() -> int:
        """Get current queue size"""
        return await redis_client.llen('queue:matchmaking')

# REST API Endpoints

@app.post("/api/session/create", response_model=SessionResponse)
async def create_session(request: CreateSessionRequest):
    """Create a new player session"""
    session_id = str(uuid.uuid4())

    session = PlayerSession(
        sessionId=session_id,
        playerName=request.playerName.strip(),
        socketId="",
        status="idle",
        createdAt=int(datetime.now().timestamp() * 1000),
        lastActivity=int(datetime.now().timestamp() * 1000)
    )

    await save_session(session)

    return SessionResponse(
        sessionId=session.sessionId,
        playerName=session.playerName,
        status=session.status,
        createdAt=session.createdAt
    )

@app.post("/api/matchmaking/join")
async def join_matchmaking(request: JoinQueueRequest):
    """Join matchmaking queue"""
    session = await get_session(request.sessionId)

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.status = "queued"
    await save_session(session)
    await MatchmakingQueue.add_player(request.sessionId)

    queue_size = await MatchmakingQueue.get_queue_size()

    return {
        "status": "queued",
        "queuePosition": queue_size,
        "estimatedWaitTime": queue_size * 5
    }

@app.post("/api/matchmaking/leave")
async def leave_matchmaking(request: JoinQueueRequest):
    """Leave matchmaking queue"""
    await MatchmakingQueue.remove_player(request.sessionId)

    session = await get_session(request.sessionId)
    if session:
        session.status = "idle"
        await save_session(session)

    return {"status": "removed"}

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    queue_size = await MatchmakingQueue.get_queue_size()

    return {
        "status": "ok",
        "timestamp": int(datetime.now().timestamp() * 1000),
        "queueSize": queue_size
    }

# Socket.IO Event Handlers

@sio.event
async def connect(sid, environ):
    """Handle client connection"""
    print(f"Client connected: {sid}")

@sio.event
async def disconnect(sid):
    """Handle client disconnection"""
    print(f"Client disconnected: {sid}")
    # TODO: Handle cleanup - remove from queue, forfeit game, etc.

@sio.event
async def queue_join(sid, data):
    """Handle join queue event"""
    try:
        session_id = data.get('sessionId')
        session = await get_session(session_id)

        if not session:
            await sio.emit('error', {'code': 'SESSION_NOT_FOUND', 'message': 'Session not found'}, room=sid)
            return

        session.status = 'queued'
        session.socketId = sid
        await save_session(session)
        await MatchmakingQueue.add_player(session_id)

        queue_size = await MatchmakingQueue.get_queue_size()
        await sio.emit('queue:status', {
            'status': 'queued',
            'playersInQueue': queue_size
        }, room=sid)
    except Exception as e:
        print(f"Error joining queue: {e}")
        await sio.emit('error', {'code': 'SERVER_ERROR', 'message': 'Failed to join queue'}, room=sid)

@sio.event
async def game_draw(sid, data):
    """Handle draw card event"""
    try:
        game_id = data.get('gameId')
        session_id = data.get('sessionId')

        game = await get_game(game_id)
        if not game:
            await sio.emit('error', {'code': 'GAME_NOT_FOUND', 'message': 'Game not found'}, room=sid)
            return

        player_role = get_player_role(game, session_id)
        if not player_role:
            await sio.emit('error', {'code': 'NOT_IN_GAME', 'message': 'You are not in this game'}, room=sid)
            return

        if game.currentTurn != player_role:
            await sio.emit('error', {'code': 'NOT_YOUR_TURN', 'message': 'It is not your turn'}, room=sid)
            return

        # Draw card
        new_card = draw_random_card()
        game.players[player_role]["cards"].append(new_card.dict())
        game.players[player_role]["totalValue"] = calculate_total([Card(**c) for c in game.players[player_role]["cards"]])

        # Check for bust
        if game.players[player_role]["totalValue"] > TARGET_NUMBER:
            game.players[player_role]["lives"] -= 1
            game.actionLog.append({
                "playerId": player_role,
                "action": "bust",
                "timestamp": int(datetime.now().timestamp() * 1000),
                "details": {"newTotal": game.players[player_role]["totalValue"]}
            })

            if game.players[player_role]["lives"] <= 0:
                game.status = "finished"
                game.winner = "player2" if player_role == "player1" else "player1"
        else:
            game.actionLog.append({
                "playerId": player_role,
                "action": "draw",
                "timestamp": int(datetime.now().timestamp() * 1000),
                "details": {"cardValue": new_card.value}
            })

        # Switch turn
        game.currentTurn = "player2" if game.currentTurn == "player1" else "player1"
        game.updatedAt = int(datetime.now().timestamp() * 1000)

        await save_game(game)
        await broadcast_game_state(game)

        # Check for game over
        if game.status == "finished":
            opponent_role = "player2" if player_role == "player1" else "player1"

            await sio.emit('game:over', {
                'gameId': game.gameId,
                'winner': 'opponent',
                'reason': 'bust',
                'finalScores': {
                    'you': game.players[player_role]["totalValue"],
                    'opponent': game.players[opponent_role]["totalValue"]
                }
            }, room=game.players[player_role]["socketId"])

            await sio.emit('game:over', {
                'gameId': game.gameId,
                'winner': 'you',
                'reason': 'bust',
                'finalScores': {
                    'you': game.players[opponent_role]["totalValue"],
                    'opponent': game.players[player_role]["totalValue"]
                }
            }, room=game.players[opponent_role]["socketId"])

    except Exception as e:
        print(f"Error drawing card: {e}")
        await sio.emit('error', {'code': 'SERVER_ERROR', 'message': 'Failed to draw card'}, room=sid)

# Run with: uvicorn main:socket_app --reload
