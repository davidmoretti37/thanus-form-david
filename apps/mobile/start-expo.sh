#!/bin/bash

# Kill any existing Expo processes
pkill -f "expo start" 2>/dev/null

# Clear Expo cache
rm -rf .expo

# Start Expo on port 8080
echo "Starting Expo on port 8080..."
npx expo start --port 8080 --clear --host 0.0.0.0

