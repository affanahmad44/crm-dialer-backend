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

SOCKET="/var/run/tailscale/tailscaled.sock"

tailscaled \
    --tun=userspace-networking \
    --socks5-server=127.0.0.1:1055 \
    --socket="${SOCKET}" \
    --state=/var/lib/tailscale/tailscaled.state &

TAILSCALED_PID=$!

echo "tailscaled started with PID: ${TAILSCALED_PID}"

echo "Waiting for Tailscale LocalAPI socket..."

READY=0

for i in $(seq 1 30); do

    echo "LocalAPI readiness check ${i}/30..."

    if [ -S "${SOCKET}" ]; then
        echo "Tailscale LocalAPI socket is ready."
        READY=1
        break
    fi

    if ! kill -0 "${TAILSCALED_PID}" 2>/dev/null; then
        echo "ERROR: tailscaled process exited."
        exit 1
    fi

    sleep 1

done

if [ "${READY}" -ne 1 ]; then

    echo "ERROR: Tailscale LocalAPI socket did not become ready."

    if kill -0 "${TAILSCALED_PID}" 2>/dev/null; then
        echo "tailscaled process is still running."
    else
        echo "tailscaled process has exited."
    fi

    exit 1
fi

echo "================================"
echo "Authenticating Tailscale"
echo "================================"

tailscale \
    --socket="${SOCKET}" \
    up \
    --auth-key="${TS_AUTHKEY}" \
    --hostname="render-tailscale-esl-test"

echo "================================"
echo "Tailscale status"
echo "================================"

tailscale \
    --socket="${SOCKET}" \
    status

echo "================================"
echo "Tailscale authentication successful"
echo "================================"

echo "Starting Node Dialer..."

exec npm start
