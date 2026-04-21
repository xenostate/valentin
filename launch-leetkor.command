#!/bin/zsh
set -e

APP_DIR="/Users/tenroman/Desktop/Projects/leetkor-app"
cd "$APP_DIR"

if [ ! -d "node_modules" ]; then
  echo "Installing LeetKor dependencies..."
  npm install
fi

echo "Starting LeetKor..."
npm start
