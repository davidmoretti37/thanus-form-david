# Use Node.js 20 as base image
FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies and FFmpeg
RUN apk add --no-cache ffmpeg && \
    npm install

# Create uploads directory
RUN mkdir -p /usr/src/app/uploads/audio

# Copy source code and .env file
COPY . .

# Copy and make the entrypoint script executable
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Set the entrypoint
ENTRYPOINT ["docker-entrypoint.sh"]

# Expose the port your app runs on
EXPOSE 3005

# Command to run the application
CMD ["npx", "tsx", "index.ts"]
