#!/usr/bin/env bash
# Manual one-command deploy (rsync + docker compose).
set -euo pipefail

HOST="${DEPLOY_HOST:-13.60.99.44}"
USER_NAME="${DEPLOY_USER:-ubuntu}"
KEY="${DEPLOY_SSH_KEY:-$HOME/Downloads/aws-ssh.pem}"
APP_DIR="${DEPLOY_PATH:-/opt/items-crud}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

rsync -az --delete \
  --exclude node_modules \
  --exclude .git \
  --exclude data \
  --exclude dist \
  -e "ssh -i ${KEY} -o StrictHostKeyChecking=accept-new" \
  "${ROOT}/" \
  "${USER_NAME}@${HOST}:${APP_DIR}/"

ssh -i "$KEY" -o StrictHostKeyChecking=accept-new "${USER_NAME}@${HOST}" bash -s <<EOF
set -euo pipefail
cd ${APP_DIR}
sudo systemctl stop nginx || true
sudo docker rm -f items-backend items-frontend 2>/dev/null || true
sudo docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
sleep 2
curl -fsS http://127.0.0.1/api/health
echo "Deployed to http://${HOST}/"
EOF
