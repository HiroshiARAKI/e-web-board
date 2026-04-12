#!/bin/sh
# Copyright 2026 Hiroshi Araki (https://hiroshi.araki.tech)
# SPDX-License-Identifier: Apache-2.0
set -e

echo "[entrypoint] Running database migrations..."
node migrate.cjs

echo "[entrypoint] Starting server..."
exec node server.js
