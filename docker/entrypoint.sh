#!/bin/sh
set -e

echo "[entrypoint] Running database migrations..."
node migrate.cjs

echo "[entrypoint] Starting server..."
exec node server.js
