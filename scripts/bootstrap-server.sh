#!/usr/bin/env bash
# First-time server bootstrap. Run from your laptop:
#   ./scripts/bootstrap-server.sh
set -euo pipefail

HOST="${DEPLOY_HOST:-13.60.99.44}"
USER_NAME="${DEPLOY_USER:-ubuntu}"
KEY="${DEPLOY_SSH_KEY:-$HOME/Downloads/aws-ssh.pem}"
APP_DIR="${DEPLOY_PATH:-/opt/items-crud}"
REPO_URL="${REPO_URL:-}"

if [[ ! -f "$KEY" ]]; then
  echo "SSH key not found: $KEY"
  exit 1
fi

SSH=(ssh -i "$KEY" -o StrictHostKeyChecking=accept-new "${USER_NAME}@${HOST}")

echo "==> Preparing ${USER_NAME}@${HOST}:${APP_DIR}"
"${SSH[@]}" bash -s <<EOF
set -euo pipefail
sudo mkdir -p ${APP_DIR}
sudo chown -R \$USER:\$USER ${APP_DIR}
if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker \$USER
fi
sudo systemctl stop nginx || true
sudo systemctl disable nginx || true
EOF

if [[ -n "$REPO_URL" ]]; then
  echo "==> Cloning ${REPO_URL}"
  "${SSH[@]}" bash -s <<EOF
set -euo pipefail
if [[ ! -d ${APP_DIR}/.git ]]; then
  git clone ${REPO_URL} ${APP_DIR}
else
  cd ${APP_DIR} && git pull --ff-only
fi
cd ${APP_DIR}
sudo docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
sleep 2
curl -fsS http://127.0.0.1/api/health
EOF
else
  echo "==> Syncing local project (no REPO_URL set)"
  rsync -az --delete \
    --exclude node_modules \
    --exclude .git \
    --exclude data \
    --exclude dist \
    -e "ssh -i ${KEY} -o StrictHostKeyChecking=accept-new" \
    "$(cd "$(dirname "$0")/.." && pwd)/" \
    "${USER_NAME}@${HOST}:${APP_DIR}/"

  "${SSH[@]}" bash -s <<EOF
set -euo pipefail
cd ${APP_DIR}
sudo systemctl stop nginx || true
sudo docker rm -f items-backend items-frontend 2>/dev/null || true
sudo docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
sudo docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
sleep 2
curl -fsS http://127.0.0.1/api/health
echo "App should be live at http://${HOST}/"
EOF
fi
