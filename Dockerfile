FROM node:22-alpine AS builder
WORKDIR /app

# Copia solo package.json (senza package-lock) per installazione
# pulita con i binari nativi corretti per Linux (rolldown, sharp)
COPY package.json ./
RUN npm install

COPY . .
RUN npm run build

# --- Runtime: nginx per i file statici + Node per le pagine dinamiche ---
# Il sito è quasi tutto statico (dist/client, servito da nginx come prima). Solo l'area
# analizzatore DVR (registrazione, accesso, area riservata, export CSV) gira sul server
# Node di Astro (dist/server) in ascolto su 127.0.0.1:4322: nginx gli passa ciò che non
# trova su disco.
FROM node:22-alpine

RUN apk add --no-cache nginx && mkdir -p /run/nginx /data

RUN printf 'map $http_x_forwarded_proto $xfp {\n\
    default $http_x_forwarded_proto;\n\
    ""      $scheme;\n\
}\n\
\n\
server {\n\
    listen 4321;\n\
    server_name _;\n\
    port_in_redirect off;\n\
    absolute_redirect off;\n\
    root /app/dist/client;\n\
    index index.html;\n\
    client_max_body_size 1m;\n\
\n\
    # Gli asset di Astro hanno un hash nel nome: si possono tenere per sempre.\n\
    location /_astro/ {\n\
        add_header Cache-Control "public, max-age=31536000, immutable";\n\
        try_files $uri =404;\n\
    }\n\
\n\
    # Tutto il resto (HTML compreso) si rivalida a ogni visita con ETag: senza\n\
    # Cache-Control il browser decide da solo e dopo un deploy tiene pagine vecchie.\n\
    # Quello che non è un file statico va al server Node di Astro.\n\
    location / {\n\
        add_header Cache-Control "no-cache";\n\
        try_files $uri $uri/ @astro;\n\
    }\n\
\n\
    location @astro {\n\
        proxy_pass http://127.0.0.1:4322;\n\
        proxy_set_header Host $host;\n\
        proxy_set_header X-Forwarded-Proto $xfp;\n\
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n\
        proxy_intercept_errors on;\n\
        add_header Cache-Control "no-store";\n\
    }\n\
\n\
    error_page 404 /index.html;\n\
\n\
    gzip on;\n\
    gzip_types text/plain text/css application/json application/javascript text/xml image/svg+xml text/csv;\n\
}\n' > /etc/nginx/http.d/default.conf

WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY scripts/dvr-utenti.mjs ./scripts/dvr-utenti.mjs

# Database utenti dell'area DVR: su Coolify montare un volume persistente su /data.
ENV NODE_ENV=production \
    DVR_DB_PATH=/data/icura.db \
    HOST=127.0.0.1 \
    PORT=4322

# Node gira in un ciclo che lo riavvia se cade; nginx resta il processo principale.
RUN printf '#!/bin/sh\n\
(while true; do node /app/dist/server/entry.mjs; echo "server Astro uscito, riavvio tra 2s" >&2; sleep 2; done) &\n\
exec nginx -g "daemon off;"\n' > /usr/local/bin/avvio && chmod +x /usr/local/bin/avvio

EXPOSE 4321
CMD ["avvio"]
