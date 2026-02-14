FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy app source
COPY . .

# Expose port
EXPOSE 3000

# Start server
CMD ["npm", "start"]
