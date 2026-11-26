# Production image for the MBX admin: build with Node, serve the static files with nginx.
#
# Coolify: Build Pack = Dockerfile, Ports Exposes = 80.
# VITE_API_BASE_URL is read at build time: mark it as a "Build Variable" in Coolify.

FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npx vite build

FROM nginx:1.27-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
