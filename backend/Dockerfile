# Use Node.js base image
FROM node:24-alpine

WORKDIR /app

# Copy dependency files
COPY package*.json ./

# Install production dependencies
RUN npm ci --omit=dev

# Copy all application code
COPY . .

# Expose server port (Vite/render defaults)
EXPOSE 8080

# Run Express server
CMD ["node", "server.js"]
