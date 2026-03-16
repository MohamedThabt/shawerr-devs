# -- Stage 1: Build ------------------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

# Enable pnpm via corepack (bundled in Node 22)
RUN corepack enable && corepack prepare pnpm@9 --activate

# Install dependencies first for better layer caching
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source and build
COPY . .

ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

RUN pnpm run build

# -- Stage 2: Production -------------------------------------------------------
FROM node:22-alpine AS production

RUN npm install -g serve@14

COPY --from=builder /app/dist /app/dist

EXPOSE 3000

CMD ["serve", "-s", "/app/dist", "-l", "3000"]
