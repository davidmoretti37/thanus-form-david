@echo off
REM Windows batch script to start all services

REM Start Redis and RabbitMQ containers
cd backend
docker compose up redis rabbitmq -d

REM Start frontend development server
cd ..\frontend
start cmd /k npm run dev

REM Start backend API
cd ..\backend
start cmd /k poetry run python api.py

REM Start dramatiq worker
cd ..\backend
start cmd /k poetry run python -m dramatiq run_agent_background

cd ..
