#!/bin/bash
set -e

# 0) Add 2 GB swap. A t3.micro has only ~1 GB RAM.
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# 1) Install git + Docker (official script also installs compose plugin)
apt-get update -y
apt-get install -y git
curl -fsSL https://get.docker.com | sh

# 2) Let the 'ubuntu' user run docker without sudo
usermod -aG docker ubuntu

# 3) Clone the repo where GitHub Actions also deploys
mkdir -p /opt/items-crud
git clone ${repo_url} /opt/items-crud
chown -R ubuntu:ubuntu /opt/items-crud
cd /opt/items-crud

if [ ! -f .env ] || ! grep -qE '^JWT_SECRET=.+' .env; then
  echo "JWT_SECRET=$(openssl rand -hex 32)" > .env
fi

docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

echo "classroom check: user_data ran at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "user_data finished: app should be running on port 80"
