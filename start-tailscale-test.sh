#!/bin/sh

set -e

echo "Starting Tailscale userspace networking..."

tailscaled \
    --tun=userspace-networking \
    --socks5-server=127.0.0.1:1055 \
    --state=/var/lib/tailscale/tailscaled.state &

echo "Waiting for Tailscale daemon..."

for i in $(seq 1 30); do
    if tailscale status >/dev/null 2>&1; then
        break
    fi

    sleep 1
done

echo "Authenticating Tailscale..."

tailscale up \
    --auth-key="${TS_AUTHKEY}" \
    --hostname="render-tailscale-esl-test"

echo "Tailscale status:"
tailscale status

echo "Starting ESL test..."

exec node /app/tailscale-esl-test.js
