#!/bin/sh

set -e

echo "================================"
echo "Starting Tailscale userspace networking"
echo "================================"

if [ -z "${TS_AUTHKEY}" ]; then
    echo "ERROR: TS_AUTHKEY environment variable is not set"
    exit 1
fi

echo "TS_AUTHKEY is configured."

tailscaled \
    --tun=userspace-networking \
    --socks5-server=127.0.0.1:1055 \
    --state=/var/lib/tailscale/tailscaled.state &

TAILSCALED_PID=$!

echo "tailscaled started with PID: ${TAILSCALED_PID}"

echo "Waiting for Tailscale daemon..."

READY=0

for i in $(seq 1 30); do

    echo "Tailscale readiness check ${i}/30..."

    if tailscale status >/dev/null 2>&1; then
        echo "Tailscale daemon is ready."
        READY=1
        break
    fi

    sleep 1

done

if [ "${READY}" -ne 1 ]; then

    echo "ERROR: Tailscale daemon did not become ready."

    echo "Checking tailscaled process..."

    if kill -0 "${TAILSCALED_PID}" 2>/dev/null; then
        echo "tailscaled process is still running."
    else
        echo "ERROR: tailscaled process has exited."
    fi

    exit 1
fi

echo "================================"
echo "Authenticating Tailscale"
echo "================================"

tailscale up \
    --auth-key="${TS_AUTHKEY}" \
    --hostname="render-tailscale-esl-test"

echo "================================"
echo "Tailscale status"
echo "================================"

tailscale status

echo "================================"
echo "Starting raw SOCKS5 ESL test"
echo "================================"

exec node /app/tailscale-esl-test.js
