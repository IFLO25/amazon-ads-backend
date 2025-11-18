
FROM node:20-alpine

# Arbeitsverzeichnis
WORKDIR /app

# System-Dependencies für Prisma
RUN apk add --no-cache openssl

# Package files kopieren
COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./

# Dependencies installieren
RUN npm install --legacy-peer-deps

# Prisma Schema kopieren
COPY prisma ./prisma/

# Prisma Client generieren
RUN npx prisma generate

# Source code kopieren
COPY src ./src/

# Build
RUN npm run build

# Port exposieren
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start command
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node dist/main"]
