
FROM node:20-alpine

# Arbeitsverzeichnis
WORKDIR /app

# System-Dependencies für Prisma
RUN apk add --no-cache openssl

# ✅ KORREKTER Pfad: nodejs_space/ verwenden
WORKDIR /app

# Package files aus nodejs_space kopieren
COPY nodejs_space/package*.json ./
COPY nodejs_space/tsconfig*.json ./
COPY nodejs_space/nest-cli.json ./

# Dependencies installieren
RUN npm install --legacy-peer-deps

# Prisma Schema kopieren
COPY nodejs_space/prisma ./prisma/

# Prisma Client generieren
RUN npx prisma generate

# Source code kopieren (aus nodejs_space!)
COPY nodejs_space/src ./src/

# Build
RUN npm run build

# Port exposieren
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start command
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node dist/main"]
