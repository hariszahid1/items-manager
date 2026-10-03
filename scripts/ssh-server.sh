#!/usr/bin/env bash
# SSH into the Ubuntu EC2 host. The -i flag is a local private key file,
# not an AMI path like amazon/ubuntu/images/...
set -euo pipefail

HOST="${DEPLOY_HOST:-13.60.99.44}"
USER_NAME="${DEPLOY_USER:-ubuntu}"
KEY="${DEPLOY_SSH_KEY:-$HOME/Downloads/aws-ssh.pem}"

if [[ ! -f "$KEY" ]]; then
  echo "Private key not found: $KEY"
  echo "Download the .pem from AWS (the key pair used when the instance was launched)."
  exit 1
fi

chmod 400 "$KEY"
exec ssh -i "$KEY" -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new "${USER_NAME}@${HOST}" "$@"
