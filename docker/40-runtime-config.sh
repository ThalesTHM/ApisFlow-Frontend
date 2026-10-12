#!/bin/sh
# Grava a URL da API definida pelo ambiente (variável API_URL da task do ECS),
# para que a mesma imagem seja promovida de homologação para produção.
set -eu

API_URL="${API_URL:-/api/v1}"
printf 'window.__APP_CONFIG__ = { apiUrl: "%s" };\n' "$API_URL" > /usr/share/nginx/html/config.js
