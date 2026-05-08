
  # Multiplayer Card Game UI

  This is a code bundle for Multiplayer Card Game UI. The original project is available at https://www.figma.com/design/e8KYikcNmsQZCDauCswPcI/Multiplayer-Card-Game-UI.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

## Backend (Card Clash 21)

This repo now includes a minimal realtime backend in `backend/` implementing the **Card Clash 21** rules (2 players, hidden card, 3 lives, rounds, turn limits, and power-ups that target the **last drawn card**).

### Run backend locally

In one terminal:

```bash
cd backend
npm install
npm run dev
```

Backend defaults to `http://localhost:4000`.

### Minimal API

- `GET /health`
- `POST /api/matches` body: `{ "playerName": "Alice" }` → `{ matchId, playerId }`
- `POST /api/matches/:matchId/join` body: `{ "playerName": "Bob" }` → `{ matchId, playerId }`
- `GET /api/matches/:matchId/state/:playerId`

### WebSocket

Socket.IO server shares the same base URL.

- `match:join { matchId, playerId }`
- `round:command { matchId, commandId, type: "DRAW" | "STAND" | "POWER_UP", payload? }`

Power-up payloads:

- `{ "type": "REMOVE" }`
- `{ "type": "SWAP" }`
- `{ "type": "OVERRIDE", "target": 19 | 21 | 28 }`
- `{ "type": "DOUBLE" }`
  