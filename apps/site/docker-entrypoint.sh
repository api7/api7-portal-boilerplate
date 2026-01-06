#!/bin/sh
set -e

# Preflight: check portal and database
echo "Running preflight checks..."
node preflight.js

echo "Starting Next.js server..."
exec "$@"
