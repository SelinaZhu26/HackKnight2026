#!/bin/bash
set -Eeuo pipefail

# Installed root-owned on fin-instance. The runner may invoke this one command,
# rather than receive unrestricted sudo or membership in the Docker group.
if [[ $# -ne 1 || ! "$1" =~ ^[0-9a-f]{40}$ ]]; then
    echo 'Usage: finapp-deploy <40-character commit SHA>' >&2
    exit 2
fi

version=$1
cd /apps/finapp
exec 9>/run/lock/finapp-deploy.lock
flock -w 300 9

docker compose config --quiet
previous_version=$(sed -n 's/^IMAGE_VERSION=//p' .env)
test -n "$previous_version"

# Download before altering the live release. The current root-owned Compose
# file and .env determine the repository and port.
env IMAGE_VERSION="$version" docker compose pull --quiet
cp -p .env .env.previous
rollback_needed=1

rollback() {
    status=$?
    trap - ERR
    if [[ "$rollback_needed" == 1 ]]; then
        echo "Deployment failed; restoring $previous_version." >&2
        cp -p .env.previous .env
        docker compose up -d --wait --wait-timeout 120 || true
    fi
    exit "$status"
}
trap rollback ERR

sed -i "s/^IMAGE_VERSION=.*/IMAGE_VERSION=$version/" .env
docker compose up -d --wait --wait-timeout 120

# Exercise the public Nginx/TLS route as well as Docker's internal health check.
curl --fail --silent --show-error --retry 3 --retry-delay 2 \
    --max-time 20 https://34.95.8.204/ -o /dev/null

rollback_needed=0
trap - ERR
rm -f .env.previous
docker compose ps
echo "Deployed excsi/finapp:$version successfully."
