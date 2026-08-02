FROM node:22.23.1-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM dependencies AS build
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
COPY tsconfig.json tsconfig.build.json prisma.config.ts ./
COPY prisma ./prisma
COPY src ./src
RUN npm run build

FROM node:22.23.1-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup -S ayos && adduser -S -G ayos ayos
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
RUN mkdir -p /app/uploads && chown -R ayos:ayos /app
USER ayos
EXPOSE 4000
CMD ["node", "dist/server.js"]
