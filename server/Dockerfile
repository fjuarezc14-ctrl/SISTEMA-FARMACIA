FROM node:24-alpine

WORKDIR /app

# Copy dependency definition
COPY package*.json ./

# Install production dependencies
RUN npm install --omit=dev

# Copy application source code
COPY . .

# Expose backend port
EXPOSE 4000

# Default environment variables
ENV NODE_ENV=production
ENV PORT=4000
ENV DATABASE_PATH=/app/src/db/pharmacy.db

# Launch server (runs migrations & seed on startup automatically)
CMD ["node", "index.js"]
