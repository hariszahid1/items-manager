# Items CRUD — Full Stack App

Simple full-stack CRUD app with a React frontend and Node.js/Express backend, deployable with Docker and GitHub Actions.

## Features

- Create, read, update, and delete items
- Persistent JSON storage (Docker volume)
- React + Vite frontend
- Express REST API
- Docker Compose + automated GitHub Actions deploy

## Project structure

```
backend/     Node.js Express API
frontend/    React (Vite) UI
scripts/     Server bootstrap + manual deploy
.github/     CI/CD deploy workflow
```

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/items` | List items |
| GET | `/api/items/:id` | Get one item |
| POST | `/api/items` | Create item |
| PUT | `/api/items/:id` | Update item |
| DELETE | `/api/items/:id` | Delete item |

## Run locally with Docker

```bash
docker compose up --build
```

- App: http://localhost:3000
- API: http://localhost:4000/api/items

## Automated deployment (GitHub Actions → AWS)

On every push to `main`, GitHub Actions SSHs into the server and runs `docker compose up --build`.

### 1. One-time server setup

From your laptop (uses `~/Downloads/aws-ssh.pem` by default):

```bash
chmod +x scripts/*.sh
./scripts/bootstrap-server.sh
```

This copies the app to `/opt/items-crud`, stops the default nginx, and starts Docker on port **80**.

After the GitHub repo exists, clone it on the server instead:

```bash
REPO_URL=git@github.com:YOUR_USER/docker-project.git ./scripts/bootstrap-server.sh
```

### 2. GitHub Actions secrets

In the GitHub repo: **Settings → Secrets and variables → Actions** add:

| Secret | Value |
|--------|--------|
| `DEPLOY_HOST` | `13.60.99.44` |
| `DEPLOY_USER` | `ubuntu` |
| `DEPLOY_SSH_KEY` | Private key that can SSH as `ubuntu` (contents of your deploy PEM/key) |

Also add the matching **public** key to the server if you use a dedicated deploy key:

```bash
ssh-copy-id -i ~/.ssh/deploy_key.pub -o IdentityFile=~/Downloads/aws-ssh.pem ubuntu@13.60.99.44
```

### 3. Trigger deploy

Push to `main`, or run the **Deploy** workflow manually from the Actions tab.

Production URL: http://13.60.99.44/

### Manual deploy (without GitHub)

```bash
./scripts/deploy.sh
```

## Local development (without Docker)

### Backend

```bash
cd backend && npm install && npm run dev
```

### Frontend

```bash
cd frontend && npm install && npm run dev
```
