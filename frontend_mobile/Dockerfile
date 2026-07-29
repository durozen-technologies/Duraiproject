# syntax=docker/dockerfile:1

# ── build: Bun installs deps, Node runs Metro (Bun lacks worker_threads bits) ─
FROM node:22-alpine AS build

COPY --from=oven/bun:1.2-alpine /usr/local/bin/bun /usr/local/bin/bun

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

ARG EXPO_PUBLIC_API_URL=http://localhost:8000/api
ENV EXPO_PUBLIC_API_URL=$EXPO_PUBLIC_API_URL \
    NODE_ENV=production \
    CI=1 \
    EXPO_NO_TELEMETRY=1

RUN npx expo export --platform web --output-dir dist

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
