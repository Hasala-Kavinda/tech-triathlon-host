FROM node:24-alpine AS build
ARG APP_DIR
ARG VITE_API_BASE_URL=http://localhost:3000
ARG VITE_LOGIN_ORIGIN=http://localhost:5173
ARG VITE_ALLOW_UNAUTHENTICATED_PROTOTYPE=false
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_LOGIN_ORIGIN=$VITE_LOGIN_ORIGIN
ENV VITE_ALLOW_UNAUTHENTICATED_PROTOTYPE=$VITE_ALLOW_UNAUTHENTICATED_PROTOTYPE
WORKDIR /app
COPY ${APP_DIR}/package.json ${APP_DIR}/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY ${APP_DIR}/ ./
RUN npm run build

FROM nginx:1.29-alpine
COPY docker/nginx/spa.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
