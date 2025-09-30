#!/bin/sh
set -e

# Load .env file if it exists
if [ -f .env ]; then
  echo "Loading environment variables from .env file"
  export $(grep -v '^#' .env | xargs)
else
  echo "No .env file found"
fi

# Run the application
exec "$@"
