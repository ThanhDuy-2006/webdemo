# Build Stage
FROM node:18-alpine as builder

WORKDIR /app

# Copy Dependencies
COPY package*.json ./
RUN npm ci

# Copy Source
COPY . .

# Build
RUN npm run build

# Production Stage
FROM nginx:alpine

# Copy built artifacts
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy Nginx Config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
