#!/bin/sh
cd /app
echo "Starting DSM Auto Parts..."
echo "Running seed..."
node server/seed.js
echo "Starting server..."
exec node server/index.js
