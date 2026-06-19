FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
ARG BACKEND_API_KEY
ARG API_URL
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf.template /tmp/nginx.conf.template
RUN apk add --no-cache gettext && \
    envsubst '${BACKEND_API_KEY} ${API_URL}' < /tmp/nginx.conf.template > /etc/nginx/conf.d/default.conf && \
    apk del gettext
EXPOSE 5173
CMD ["nginx", "-g", "daemon off;"]
