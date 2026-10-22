FROM node:22-alpine AS builder
WORKDIR /app

# Copia solo package.json (senza package-lock) per installazione
# pulita con i binari nativi corretti per Linux (rolldown, sharp)
COPY package.json ./
RUN npm install

COPY . .
RUN npm run build

# --- Runtime: nginx per servire i file statici ---
FROM nginx:alpine

RUN printf 'server {\n\
    listen 4321;\n\
    server_name _;\n\
    port_in_redirect off;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
\n\
    # Gli asset di Astro hanno un hash nel nome: si possono tenere per sempre.\n\
    location /_astro/ {\n\
        add_header Cache-Control "public, max-age=31536000, immutable";\n\
    }\n\
\n\
    # Tutto il resto (HTML compreso) si rivalida a ogni visita con ETag: senza\n\
    # Cache-Control il browser decide da solo e dopo un deploy tiene pagine vecchie.\n\
    location / {\n\
        add_header Cache-Control "no-cache";\n\
        try_files $uri $uri/ =404;\n\
    }\n\
\n\
    error_page 404 /index.html;\n\
\n\
    gzip on;\n\
    gzip_types text/plain text/css application/json application/javascript text/xml image/svg+xml;\n\
}\n' > /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 4321
CMD ["nginx", "-g", "daemon off;"]
