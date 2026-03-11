# Use Node.js 20 as the base image
FROM node:20-slim AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the frontend
RUN npm run build

# Final stage
FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm install --omit=dev

# Copy the built frontend from the builder stage
COPY --from=builder /app/dist ./dist

# Copy the server and source files needed for runtime
COPY server.ts ./
COPY src ./src

# Expose the port the app runs on
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Command to start the application
CMD ["npm", "start"]
