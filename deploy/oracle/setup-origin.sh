#!/usr/bin/env bash
# Provision the static CalcSpace origin on an Ubuntu VM (Oracle Cloud).
#
# Run once on the VM:
#   curl -fsSL https://raw.githubusercontent.com/vikasdocker/calcspace/main/deploy/oracle/setup-origin.sh | bash
#
# The origin listens on 127.0.0.1:8081 only. Public traffic arrives through the
# Cloudflare Tunnel configured in deploy/oracle/README.md, so no inbound ports
# are opened on the VM.
set -euo pipefail

ROOT=/opt/calcspace
SITE="$ROOT/site"
CONFIG="$ROOT/Caddyfile"
CONTAINER=calcspace-web
PORT=8081

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required. Install it first: curl -fsSL https://get.docker.com | sudo sh" >&2
  exit 1
fi

sudo install -d -o "$USER" -g "$USER" "$SITE"

if [ ! -f "$CONFIG" ]; then
  sudo tee "$CONFIG" >/dev/null <<'CADDY'
:8080 {
	root * /srv
	encode zstd gzip

	# Every route is pre-rendered by the Vite build, so a real 404 is possible.
	try_files {path} {path}.html {path}/index.html
	file_server

	header {
		X-Content-Type-Options nosniff
		Referrer-Policy strict-origin-when-cross-origin
		X-Frame-Options SAMEORIGIN
		-Server
	}

	@immutable path /assets/*
	header @immutable Cache-Control "public, max-age=31536000, immutable"

	@documents path / *.html
	header @documents Cache-Control "public, max-age=300, must-revalidate"

	handle_errors {
		rewrite * /404.html
		file_server
	}
}
CADDY
fi

sudo docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
sudo docker run -d --name "$CONTAINER" --restart unless-stopped \
  -p "127.0.0.1:$PORT:8080" \
  -v "$SITE:/srv:ro" \
  -v "$CONFIG:/etc/caddy/Caddyfile:ro" \
  caddy:2 >/dev/null

sleep 3
curl -fsS -o /dev/null "http://127.0.0.1:$PORT/" || {
  echo "Origin did not start. Check: sudo docker logs $CONTAINER" >&2
  exit 1
}

echo "Origin is serving on http://127.0.0.1:$PORT"
echo "Next: run the Cloudflare Tunnel (see deploy/oracle/README.md)."
