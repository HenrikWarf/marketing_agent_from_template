#!/bin/bash

# Function to handle cleanup on exit
cleanup() {
    echo "Shutting down..."
    kill $ADK_PID 2>/dev/null
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit
}

trap cleanup SIGINT SIGTERM

# Kill any existing processes on these ports
echo "Cleaning up stale processes..."
lsof -ti:8000,3000,5173 | xargs kill -9 2>/dev/null

echo "Starting ADK Agent Backend (Port 8000)..."
adk api_server agents/ --port 8000 --auto_create_session &
ADK_PID=$!

# Wait for ADK to be ready
sleep 3

echo "Starting CampaignFlow Proxy (FastAPI Port 3000)..."
python3 -m frontend.app &
BACKEND_PID=$!

# Wait for Proxy to be ready
sleep 2

echo "Starting CampaignFlow UI (React Port 5173)..."
cd campaign-flow && npm run dev &
FRONTEND_PID=$!

echo "=========================================="
echo "CampaignFlow is now running!"
echo "ADK Backend: http://localhost:8000"
echo "Proxy API:   http://localhost:3000"
echo "Frontend UI: http://localhost:5173"
echo "=========================================="

wait
