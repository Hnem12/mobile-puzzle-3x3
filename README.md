# Mobile Puzzle Game 3x3

Full-stack responsive web app for a 3x3 sliding puzzle minigame with an Admin Portal, REST API, MongoDB persistence, image uploads, game settings, history, leaderboard, and Docker deployment.

## Quick Start

```bash
npm install
cp server/.env.example server/.env
npm run seed
npm run dev
```

- User game: `http://localhost:5173`
- Admin portal: `http://localhost:5173/admin`
- API: `http://localhost:4000/api`

Default admin:

```txt
Username: admin
Password: admin123
```

## Docker

```bash
docker compose up --build
```

## Database Collections

- `users`: fullName, phone, createdAt
- `game_images`: name, imageUrl, status, gridSize, createdAt
- `game_levels`: name, timeLimit, maxScore, quickWinSeconds, scoreRules
- `game_settings`: playMode, allowMultiplePlay, gameStatus, leaderboardEnabled, updatedAt
- `game_histories`: userId, levelId, result, score, duration, moves, playedAt

## API Summary

### Auth

- `POST /api/auth/login` body `{ "username": "admin", "password": "admin123" }`

### Admin Images

- `GET /api/admin/images`
- `POST /api/admin/images` multipart fields: `image`, `name`, `gridSize`
- `PATCH /api/admin/images/:id/status` body `{ "status": "ACTIVE" | "INACTIVE" }`
- `DELETE /api/admin/images/:id`

### Admin Histories

- `GET /api/admin/histories?name=&phone=&level=&result=&from=&to=`
- `GET /api/admin/histories/export`
- `GET /api/admin/dashboard`

### Settings

- `GET /api/admin/settings`
- `PUT /api/admin/settings`
- `GET /api/admin/levels`
- `PUT /api/admin/levels/:id`

### Public Game

- `GET /api/game/bootstrap`
- `POST /api/game/register` body `{ "fullName": "...", "phone": "..." }`
- `POST /api/game/histories` body `{ "userId", "levelId", "result", "score", "duration", "moves" }`
- `GET /api/game/leaderboard`
