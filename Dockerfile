# Use Node.js base image
FROM node:24-alpine

WORKDIR /app

# Copy dependency files from the backend subdirectory
COPY backend/package*.json ./backend/

# Install backend production dependencies
RUN cd backend && npm ci --omit=dev

# Copy all backend application code
COPY backend/ ./backend/

# Set working directory to the backend subdirectory
WORKDIR /app/backend

# Expose Express server port
EXPOSE 8080

# Run the Express server
CMD ["node", "server.js"]
