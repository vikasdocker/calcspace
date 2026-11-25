# Production deployment

| Piece | Service |
| --- | --- |
| Source and CI/CD | GitHub Actions (`vikasdocker/calcspace`) |
| Hosting | Oracle Cloud VM `140.238.227.216` (existing instance) |
| Web server | Caddy 2 container, `127.0.0.1:8081` |
| Edge, DNS, TLS | Cloudflare, `calcspace.blueflutex.in` via a named tunnel |

The VM exposes only SSH. HTTP requests travel over the Cloudflare Tunnel, so no
inbound web ports need to be opened in the Oracle security list.

## Layout on the VM

```
/opt/calcspace/site/       built static files (owned by ubuntu)
/opt/calcspace/Caddyfile   origin server config
calcspace-web              Caddy container, bound to 127.0.0.1:8081
/etc/cloudflared/calcspace.yml / .json   tunnel config (600)
cloudflared-calcspace.service            tunnel systemd unit
```

## First-time setup

1. Provision the origin:

   ```bash
   curl -fsSL https://raw.githubusercontent.com/vikasdocker/calcspace/main/deploy/oracle/setup-origin.sh | bash
   ```

2. Create the tunnel (from a machine logged in to Cloudflare):

   ```bash
   cloudflared tunnel create calcspace
   cloudflared tunnel route dns --overwrite-dns calcspace calcspace.blueflutex.in
   ```

3. Install the tunnel on the VM: copy the tunnel credentials to
   `/etc/cloudflared/calcspace.json`, write `/etc/cloudflared/calcspace.yml`,
   and enable `cloudflared-calcspace.service`. The config is:

   ```yaml
   tunnel: <tunnel-id>
   credentials-file: /etc/cloudflared/calcspace.json
   no-autoupdate: true
   ingress:
     - hostname: calcspace.blueflutex.in
       service: http://127.0.0.1:8081
     - service: http_status:404
   ```

## Continuous deployment

`.github/workflows/deploy.yml` runs on every push to `main`:

1. `npm ci`, `npm test`, `npm run build` with
   `VITE_SITE_URL=https://calcspace.blueflutex.in`.
2. `rsync --delete` the build into `/opt/calcspace/site/`.
3. Verify the live site and sitemap.

Required repository secrets:

| Secret | Value |
| --- | --- |
| `ORACLE_HOST` | `140.238.227.216` |
| `ORACLE_USER` | `ubuntu` |
| `ORACLE_SSH_KEY` | private key of the deploy keypair |

`.github/workflows/ci.yml` runs the same checks on pull requests.

## Manual deploy

```powershell
$env:VITE_SITE_URL = "https://calcspace.blueflutex.in"
npm.cmd ci
npm.cmd test
npm.cmd run build
rsync -az --delete -e ssh dist/ ubuntu@140.238.227.216:/opt/calcspace/site/
```

There is no build step on the server: Caddy serves the files straight from the
bind mount, so a deploy is live as soon as the transfer completes.

## Rollback

Re-run the deploy workflow from an earlier commit:

```bash
gh workflow run deploy.yml --ref <commit-sha>
```
