#!/bin/bash

# Start Redis and RabbitMQ containers
cd backend
docker compose up redis rabbitmq -d

# Start frontend development server
cd ../frontend
npm run dev &

# Start backend API
cd ../backend
poetry run python3.11 api.py &

# Start dramatiq worker
cd ../backend
poetry run python3.11 -m dramatiq run_agent_background
