#!/bin/bash

# CampaignFlow Unified Startup Script
# This script starts the ADK Agent Backend, the FastAPI Proxy, and the React UI.

# Navigate to the project root (one level up from campaign-flow/scripts)
ROOT_DIR="$(cd "$(dirname "$0")/../../" && pwd)"
cd "$ROOT_DIR"

# Function to handle cleanup on exit
cleanup() {
    echo ""
    echo "Shutting down CampaignFlow..."
    kill $ADK_PID 2>/dev/null
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    # Robust cleanup of ports
    lsof -ti:8000,3000,5173 | xargs kill -9 2>/dev/null
    exit
}

trap cleanup SIGINT SIGTERM

# Kill any existing processes on these ports to avoid bind errors
echo "Cleaning up stale processes on 8000, 3000, 5173..."
lsof -ti:8000,3000,5173 | xargs kill -9 2>/dev/null
sleep 1

echo "Starting ADK Agent Backend (Port 8000)..."
adk api_server agents/ --port 8000 --auto_create_session > adk_server.log 2>&1 &
ADK_PID=$!

# Wait for ADK to be ready
echo "Waiting for ADK to initialize..."
for i in {1..10}; do
    if curl -s http://localhost:8000/list-apps > /dev/null; then
        echo "ADK is ready."
        break
    fi
    sleep 1
done

echo "Starting CampaignFlow Proxy (FastAPI Port 3000)..."
export PYTHONPATH="$ROOT_DIR"
python3 -m frontend.app > proxy_server.log 2>&1 &
BACKEND_PID=$!

# Wait for Proxy to be ready
echo "Waiting for Proxy to initialize..."
for i in {1..10}; do
    if curl -s http://localhost:3000/api/environments > /dev/null; then
        echo "Proxy is ready."
        break
    fi
    sleep 1
done

echo "Starting CampaignFlow UI (React Port 5173)..."
cd campaign-flow && npm run dev &
FRONTEND_PID=$!

echo "=========================================="
echo "CampaignFlow is now running!"
echo "ADK Backend: http://localhost:8000 (Log: adk_server.log)"
echo "Proxy API:   http://localhost:3000 (Log: proxy_server.log)"
echo "Frontend UI: http://localhost:5173"
echo "=========================================="

wait
