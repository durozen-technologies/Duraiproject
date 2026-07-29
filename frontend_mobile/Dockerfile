# syntax=docker/dockerfile:1

# ── deps: install with Bun ───────────────────────────────────────────────────
FROM oven/bun:1.2-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN bun install

# ── build: Expo static web export ────────────────────────────────────────────
FROM oven/bun:1.2-alpine AS build

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY . .

ARG EXPO_PUBLIC_API_URL=http://localhost:8000/api
ENV EXPO_PUBLIC_API_URL=$EXPO_PUBLIC_API_URL \
    NODE_ENV=production \
    CI=1 \
    EXPO_NO_TELEMETRY=1

RUN bunx expo export --platform web

# ── runtime: nginx alpine serves static site ─────────────────────────────────
FROM nginx:1.27-alpine AS runtime

RUN rm -rf /usr/share/nginx/html/*

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

RUN chown -R nginx:nginx /usr/share/nginx/html \
    && chmod -R a+rX /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
