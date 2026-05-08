/**
 * Card Clash 21 - Backend Server Implementation (Node.js + TypeScript)
 *
 * Tech Stack:
 * - Express.js (REST API)
 * - Socket.IO (WebSocket)
 * - Redis (State management)
 * - TypeScript
 */

import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import cors from 'cors';

// Types
interface PlayerSession {
  sessionId: string;
  playerName: string;
  socketId: string;
  status: 'idle' | 'queued' | 'in-game';
  gameId?: string;
  createdAt: number;
  lastActivity: number;
}

interface Card {
  id: string;
  value: number;
  visible: boolean;
}

interface PowerUp {
  id: string;
  type: 'remove_opponent_card' | 'remove_own_card' | 'swap_card' | 'target_override';
  used: boolean;
}

interface PlayerGameData {
  sessionId: string;
  playerName: string;
  socketId: string;
  lives: number;
  cards: Card[];
  totalValue: number;
  hasStood: boolean;
  powerUps: PowerUp[];
}

interface GameState {
  gameId: string;
  players: {
    player1: PlayerGameData;
    player2: PlayerGameData;
  };
  currentTurn: 'player1' | 'player2';
  targetNumber: number;
  status: 'waiting' | 'active' | 'finished';
  winner?: 'player1' | 'player2' | 'draw';
  actionLog: any[];
  createdAt: number;
  updatedAt: number;
}

// Configuration
const PORT = process.env.PORT || 3000;
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');
const TARGET_NUMBER = 21;
const STARTING_LIVES = 3;
const SESSION_TTL = 3600; // 1 hour
const GAME_TTL = 7200; // 2 hours

// Initialize Express
const app = express();
app.use(cors());
app.use(express.json());

// Initialize HTTP server
const httpServer = createServer(app);

// Initialize Socket.IO
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Initialize Redis
const redis = new Redis({
  host: REDIS_HOST,
  port: REDIS_PORT,
});

// Matchmaking queue
class MatchmakingQueue {
  async addPlayer(sessionId: string): Promise<void> {
    await redis.rpush('queue:matchmaking', sessionId);
    await this.tryMatchPlayers();
  }

  async removePlayer(sessionId: string): Promise<void> {
    await redis.lrem('queue:matchmaking', 0, sessionId);
  }

  async tryMatchPlayers(): Promise<void> {
    const queueSize = await redis.llen('queue:matchmaking');

    if (queueSize >= 2) {
      const sessionId1 = await redis.lpop('queue:matchmaking');
      const sessionId2 = await redis.lpop('queue:matchmaking');

      if (sessionId1 && sessionId2) {
        const session1 = await getSession(sessionId1);
        const session2 = await getSession(sessionId2);

        if (session1 && session2) {
          const gameId = await createGame(session1, session2);

          // Notify both players
          io.to(session1.socketId).emit('match:found', {
            gameId,
            opponentName: session2.playerName,
            yourTurn: true
          });

          io.to(session2.socketId).emit('match:found', {
            gameId,
            opponentName: session1.playerName,
            yourTurn: false
          });

          // Update sessions
          session1.status = 'in-game';
          session1.gameId = gameId;
          session2.status = 'in-game';
          session2.gameId = gameId;

          await saveSession(session1);
          await saveSession(session2);
        }
      }
    }
  }

  async getQueueSize(): Promise<number> {
    return await redis.llen('queue:matchmaking');
  }
}

const matchmakingQueue = new MatchmakingQueue();

// Helper functions
async function saveSession(session: PlayerSession): Promise<void> {
  await redis.setex(
    `session:${session.sessionId}`,
    SESSION_TTL,
    JSON.stringify(session)
  );
}

async function getSession(sessionId: string): Promise<PlayerSession | null> {
  const data = await redis.get(`session:${sessionId}`);
  return data ? JSON.parse(data) : null;
}

async function saveGame(game: GameState): Promise<void> {
  await redis.setex(
    `game:${game.gameId}`,
    GAME_TTL,
    JSON.stringify(game)
  );
}

async function getGame(gameId: string): Promise<GameState | null> {
  const data = await redis.get(`game:${gameId}`);
  return data ? JSON.parse(data) : null;
}

function drawRandomCard(): Card {
  return {
    id: uuidv4(),
    value: Math.floor(Math.random() * 10) + 1, // 1-10
    visible: true
  };
}

function calculateTotal(cards: Card[]): number {
  return cards.reduce((sum, card) => sum + card.value, 0);
}

async function createGame(session1: PlayerSession, session2: PlayerSession): Promise<string> {
  const gameId = uuidv4();

  // Initial cards
  const player1Cards = [drawRandomCard(), drawRandomCard()];
  const player2Cards = [drawRandomCard(), drawRandomCard()];

  const gameState: GameState = {
    gameId,
    players: {
      player1: {
        sessionId: session1.sessionId,
        playerName: session1.playerName,
        socketId: session1.socketId,
        lives: STARTING_LIVES,
        cards: player1Cards,
        totalValue: calculateTotal(player1Cards),
        hasStood: false,
        powerUps: []
      },
      player2: {
        sessionId: session2.sessionId,
        playerName: session2.playerName,
        socketId: session2.socketId,
        lives: STARTING_LIVES,
        cards: player2Cards,
        totalValue: calculateTotal(player2Cards),
        hasStood: false,
        powerUps: []
      }
    },
    currentTurn: 'player1', // Random or always player1 starts
    targetNumber: TARGET_NUMBER,
    status: 'active',
    actionLog: [
      { action: 'game_started', timestamp: Date.now() }
    ],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  await saveGame(gameState);
  return gameId;
}

function getPlayerRole(game: GameState, sessionId: string): 'player1' | 'player2' | null {
  if (game.players.player1.sessionId === sessionId) return 'player1';
  if (game.players.player2.sessionId === sessionId) return 'player2';
  return null;
}

function broadcastGameState(game: GameState): void {
  const player1State = {
    gameId: game.gameId,
    currentTurn: game.currentTurn,
    myCards: game.players.player1.cards,
    myTotal: game.players.player1.totalValue,
    myLives: game.players.player1.lives,
    opponentCards: game.players.player2.cards.filter(c => c.visible),
    opponentVisibleTotal: calculateTotal(game.players.player2.cards.filter(c => c.visible)),
    opponentLives: game.players.player2.lives,
    actionLog: game.actionLog.slice(-10)
  };

  const player2State = {
    gameId: game.gameId,
    currentTurn: game.currentTurn,
    myCards: game.players.player2.cards,
    myTotal: game.players.player2.totalValue,
    myLives: game.players.player2.lives,
    opponentCards: game.players.player1.cards.filter(c => c.visible),
    opponentVisibleTotal: calculateTotal(game.players.player1.cards.filter(c => c.visible)),
    opponentLives: game.players.player1.lives,
    actionLog: game.actionLog.slice(-10)
  };

  io.to(game.players.player1.socketId).emit('game:state_update', player1State);
  io.to(game.players.player2.socketId).emit('game:state_update', player2State);
}

// REST API Endpoints

app.post('/api/session/create', async (req, res) => {
  try {
    const { playerName } = req.body;

    if (!playerName || playerName.length < 2 || playerName.length > 20) {
      return res.status(400).json({
        code: 'INVALID_NAME',
        message: 'Player name must be 2-20 characters'
      });
    }

    const sessionId = uuidv4();
    const session: PlayerSession = {
      sessionId,
      playerName: playerName.trim(),
      socketId: '',
      status: 'idle',
      createdAt: Date.now(),
      lastActivity: Date.now()
    };

    await saveSession(session);

    res.status(201).json({
      sessionId: session.sessionId,
      playerName: session.playerName,
      status: session.status,
      createdAt: session.createdAt
    });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({
      code: 'SERVER_ERROR',
      message: 'Failed to create session'
    });
  }
});

app.post('/api/matchmaking/join', async (req, res) => {
  try {
    const { sessionId } = req.body;
    const session = await getSession(sessionId);

    if (!session) {
      return res.status(404).json({
        code: 'SESSION_NOT_FOUND',
        message: 'Session not found or expired'
      });
    }

    session.status = 'queued';
    await saveSession(session);
    await matchmakingQueue.addPlayer(sessionId);

    const queueSize = await matchmakingQueue.getQueueSize();

    res.json({
      status: 'queued',
      queuePosition: queueSize,
      estimatedWaitTime: queueSize * 5 // rough estimate
    });
  } catch (error) {
    console.error('Error joining matchmaking:', error);
    res.status(500).json({
      code: 'SERVER_ERROR',
      message: 'Failed to join matchmaking'
    });
  }
});

app.post('/api/matchmaking/leave', async (req, res) => {
  try {
    const { sessionId } = req.body;
    await matchmakingQueue.removePlayer(sessionId);

    const session = await getSession(sessionId);
    if (session) {
      session.status = 'idle';
      await saveSession(session);
    }

    res.json({ status: 'removed' });
  } catch (error) {
    console.error('Error leaving matchmaking:', error);
    res.status(500).json({
      code: 'SERVER_ERROR',
      message: 'Failed to leave matchmaking'
    });
  }
});

app.get('/api/health', async (req, res) => {
  const queueSize = await matchmakingQueue.getQueueSize();

  res.json({
    status: 'ok',
    timestamp: Date.now(),
    queueSize
  });
});

// WebSocket handlers

io.on('connection', async (socket) => {
  console.log('Client connected:', socket.id);

  const sessionId = socket.handshake.query.sessionId as string;

  if (sessionId) {
    const session = await getSession(sessionId);
    if (session) {
      session.socketId = socket.id;
      await saveSession(session);
    }
  }

  socket.on('queue:join', async (data) => {
    try {
      const { sessionId } = data;
      const session = await getSession(sessionId);

      if (!session) {
        socket.emit('error', { code: 'SESSION_NOT_FOUND', message: 'Session not found' });
        return;
      }

      session.status = 'queued';
      session.socketId = socket.id;
      await saveSession(session);
      await matchmakingQueue.addPlayer(sessionId);

      const queueSize = await matchmakingQueue.getQueueSize();
      socket.emit('queue:status', {
        status: 'queued',
        playersInQueue: queueSize
      });
    } catch (error) {
      console.error('Error joining queue:', error);
      socket.emit('error', { code: 'SERVER_ERROR', message: 'Failed to join queue' });
    }
  });

  socket.on('queue:leave', async (data) => {
    try {
      const { sessionId } = data;
      await matchmakingQueue.removePlayer(sessionId);

      const session = await getSession(sessionId);
      if (session) {
        session.status = 'idle';
        await saveSession(session);
      }
    } catch (error) {
      console.error('Error leaving queue:', error);
    }
  });

  socket.on('game:draw', async (data) => {
    try {
      const { gameId, sessionId } = data;
      const game = await getGame(gameId);

      if (!game) {
        socket.emit('error', { code: 'GAME_NOT_FOUND', message: 'Game not found' });
        return;
      }

      const playerRole = getPlayerRole(game, sessionId);
      if (!playerRole) {
        socket.emit('error', { code: 'NOT_IN_GAME', message: 'You are not in this game' });
        return;
      }

      if (game.currentTurn !== playerRole) {
        socket.emit('error', { code: 'NOT_YOUR_TURN', message: 'It is not your turn' });
        return;
      }

      // Draw card
      const newCard = drawRandomCard();
      game.players[playerRole].cards.push(newCard);
      game.players[playerRole].totalValue = calculateTotal(game.players[playerRole].cards);

      // Check for bust
      if (game.players[playerRole].totalValue > TARGET_NUMBER) {
        game.players[playerRole].lives -= 1;
        game.actionLog.push({
          playerId: playerRole,
          action: 'bust',
          timestamp: Date.now(),
          details: { newTotal: game.players[playerRole].totalValue }
        });

        // Check if player ran out of lives
        if (game.players[playerRole].lives <= 0) {
          game.status = 'finished';
          game.winner = playerRole === 'player1' ? 'player2' : 'player1';
        }
      } else {
        game.actionLog.push({
          playerId: playerRole,
          action: 'draw',
          timestamp: Date.now(),
          details: { cardValue: newCard.value }
        });
      }

      // Switch turn
      game.currentTurn = game.currentTurn === 'player1' ? 'player2' : 'player1';
      game.updatedAt = Date.now();

      await saveGame(game);
      broadcastGameState(game);

      // Check for game over
      if (game.status === 'finished') {
        const opponentRole = playerRole === 'player1' ? 'player2' : 'player1';

        io.to(game.players[playerRole].socketId).emit('game:over', {
          gameId: game.gameId,
          winner: 'opponent',
          reason: 'bust',
          finalScores: {
            you: game.players[playerRole].totalValue,
            opponent: game.players[opponentRole].totalValue
          }
        });

        io.to(game.players[opponentRole].socketId).emit('game:over', {
          gameId: game.gameId,
          winner: 'you',
          reason: 'bust',
          finalScores: {
            you: game.players[opponentRole].totalValue,
            opponent: game.players[playerRole].totalValue
          }
        });
      }
    } catch (error) {
      console.error('Error drawing card:', error);
      socket.emit('error', { code: 'SERVER_ERROR', message: 'Failed to draw card' });
    }
  });

  socket.on('game:stand', async (data) => {
    try {
      const { gameId, sessionId } = data;
      const game = await getGame(gameId);

      if (!game) {
        socket.emit('error', { code: 'GAME_NOT_FOUND', message: 'Game not found' });
        return;
      }

      const playerRole = getPlayerRole(game, sessionId);
      if (!playerRole) {
        socket.emit('error', { code: 'NOT_IN_GAME', message: 'You are not in this game' });
        return;
      }

      if (game.currentTurn !== playerRole) {
        socket.emit('error', { code: 'NOT_YOUR_TURN', message: 'It is not your turn' });
        return;
      }

      game.players[playerRole].hasStood = true;
      game.actionLog.push({
        playerId: playerRole,
        action: 'stand',
        timestamp: Date.now()
      });

      // Check if both players stood
      if (game.players.player1.hasStood && game.players.player2.hasStood) {
        game.status = 'finished';

        const p1Total = game.players.player1.totalValue;
        const p2Total = game.players.player2.totalValue;

        if (p1Total > TARGET_NUMBER && p2Total > TARGET_NUMBER) {
          game.winner = 'draw';
        } else if (p1Total > TARGET_NUMBER) {
          game.winner = 'player2';
        } else if (p2Total > TARGET_NUMBER) {
          game.winner = 'player1';
        } else if (p1Total > p2Total) {
          game.winner = 'player1';
        } else if (p2Total > p1Total) {
          game.winner = 'player2';
        } else {
          game.winner = 'draw';
        }
      } else {
        // Switch turn
        game.currentTurn = game.currentTurn === 'player1' ? 'player2' : 'player1';
      }

      game.updatedAt = Date.now();
      await saveGame(game);
      broadcastGameState(game);

      // Send game over events
      if (game.status === 'finished') {
        const determineWinner = (role: 'player1' | 'player2') => {
          if (game.winner === 'draw') return 'draw';
          return game.winner === role ? 'you' : 'opponent';
        };

        io.to(game.players.player1.socketId).emit('game:over', {
          gameId: game.gameId,
          winner: determineWinner('player1'),
          reason: 'stand',
          finalScores: {
            you: game.players.player1.totalValue,
            opponent: game.players.player2.totalValue
          }
        });

        io.to(game.players.player2.socketId).emit('game:over', {
          gameId: game.gameId,
          winner: determineWinner('player2'),
          reason: 'stand',
          finalScores: {
            you: game.players.player2.totalValue,
            opponent: game.players.player1.totalValue
          }
        });
      }
    } catch (error) {
      console.error('Error standing:', error);
      socket.emit('error', { code: 'SERVER_ERROR', message: 'Failed to stand' });
    }
  });

  socket.on('disconnect', async () => {
    console.log('Client disconnected:', socket.id);

    // Handle cleanup - remove from queue, forfeit game, etc.
    // Implementation depends on desired behavior
  });
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`🚀 Card Clash 21 server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  httpServer.close(() => {
    redis.quit();
    process.exit(0);
  });
});
