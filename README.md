# Items CRUD — Full Stack App

Simple full-stack CRUD app with a React frontend and Node.js/Express backend, deployable with Docker.

## Features

- Create, read, update, and delete items
- Persistent JSON storage (Docker volume)
- React + Vite frontend
- Express REST API
- Docker Compose one-command deploy

## Project structure

```
backend/     Node.js Express API
frontend/    React (Vite) UI
data/        Local JSON storage (dev)
```

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/items` | List items |
| GET | `/api/items/:id` | Get one item |
| POST | `/api/items` | Create item |
| PUT | `/api/items/:id` | Update item |
| DELETE | `/api/items/:id` | Delete item |

Body for create/update:

```json
{ "title": "Buy milk", "description": "2 liters" }
```

## Run with Docker (recommended)

```bash
docker compose up --build
```

Open:

- App: http://localhost:3000
- API: http://localhost:4000/api/items

Stop:

```bash
docker compose down
```

## Local development (without Docker)

### Backend

```bash
cd backend
npm install
npm run dev
```

API runs at http://localhost:4000

### Frontend

```bash
cd frontend
npm install
npm run dev
```

UI runs at http://localhost:5173 (proxies `/api` to the backend).
