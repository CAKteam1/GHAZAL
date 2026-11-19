#!/data/data/com.termux/files/usr/bin/bash
# GHAZAL v2.0 — One-Click Android Termux Installer & Launcher
set -e

echo "============================================"
echo "  GHAZAL v2.0 — Android Termux Setup"
echo "============================================"

pkg update -y
pkg install -y nodejs-lts git

if [ ! -d "node_modules" ]; then
  echo "[GHAZAL] Installing dependencies..."
  npm install --workspaces --ignore-scripts
fi

echo "[GHAZAL] Starting Server + Mobile Web UI..."
echo "[GHAZAL] Open http://localhost:5173 in your Android browser (Chrome -> Add to Home Screen)."
npm run dev:mobile
