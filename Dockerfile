# ============ Build Stage ============
FROM node:20-alpine AS builder

WORKDIR /app
COPY client/package.json client/package-lock.json* ./client/
RUN cd client && npm install

COPY client/ ./client/
RUN cd client && npm run build

# ============ Runtime Stage ============
FROM node:20-alpine

WORKDIR /app

# Copy server
COPY server/package.json server/package-lock.json* ./server/
RUN cd server && npm install --omit=dev

COPY server/ ./server/

# Copy built client from builder
COPY --from=builder /app/client/dist ./client/dist

# Startup script
COPY startup.sh /app/startup.sh
RUN chmod +x /app/startup.sh

# Ensure data directory persists
RUN mkdir -p /app/server/data
VOLUME /app/server/data

EXPOSE 3000
ENV PORT=3000

CMD ["/app/startup.sh"]
