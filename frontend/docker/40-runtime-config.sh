#!/bin/sh
set -eu
node /opt/cryptobattle/runtime-config.mjs /usr/share/nginx/html/runtime-config.js
if [ "${CRYPTOBATTLE_STANDALONE:-false}" = "true" ]; then
  node /opt/cryptobattle/operator-api.mjs /etc/nginx/operator-api.conf
fi
