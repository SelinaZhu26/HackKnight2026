# Finapp Next.js server

A minimal Next.js backend that serves the existing plain HTML/CSS/JavaScript
frontend. The `/` route returns `index.html` unchanged; Next.js serves
`/styles.css`, `/future.css`, `/js/*`, and `/index.html` from its `public` directory. Existing
hash routes such as `/#/learn` continue to be handled by the browser.

## Development

Requires Node.js 20.9 or newer and npm. From this directory:

```sh
npm ci
npm run dev
```

Open http://localhost:3000. The server binds to loopback by default.

The dev and build commands automatically copy `../index.html`, `../styles.css`,
`../future.css`, and `../js/` into the generated `public/` directory. Edit the original frontend
files. After frontend changes during development, run `npm run sync` to refresh
the served copies. Do not edit generated copies directly.

## Production

With the repository present:

```sh
cd backend
npm ci
npm run build
npm start
```

Use `npm start -- --port 3001` to select a different port. `npm start` requires
a successful production build. After changing frontend files, rebuild before
restarting the production server.

For deployment, either build the repository on the target host, or transfer
`backend/.next/`, `backend/public/`, `backend/package.json`, and
`backend/package-lock.json` together to a compatible Node.js host, then run
`npm ci --omit=dev` and `npm start` from that directory. Keep `.next` and `public`
from the same build. Node.js is required at runtime.

## Docker and Compose

From the repository root (the directory above `backend`):

```sh
docker compose -f compose.yaml -f compose.build.yaml up --build -d --wait
```

Open http://localhost:3001. Compose publishes the container's port 3000 on
host loopback port 3001, leaving port 3000 available for the local Node server.
The image runs a production build as a non-root user and includes an HTTP
health check. Frontend assets are bundled into the image; no source bind mounts
or host Node.js installation are needed at runtime.

```sh
docker compose logs -f finapp
docker compose down
```

The root `.env` selects `IMAGE_REPOSITORY`, `IMAGE_VERSION`, and `FINAPP_PORT`.
If it is missing, copy `.env.example` to `.env` and set your Docker Hub namespace.
After frontend or backend changes, use the same build command again. To choose
another host port, update `FINAPP_PORT` in `.env`.

The base `compose.yaml` deploys an existing versioned image. The separate
`compose.build.yaml` adds local build instructions, so the server only needs
`compose.yaml` and `.env`, without the frontend source or Dockerfile.

## Publish and deploy a version

Set `IMAGE_REPOSITORY` to your Docker Hub repository (for example,
`yourname/finapp`) and select a new `IMAGE_VERSION` in `.env`. From the root:

```sh
docker login
docker compose -f compose.yaml -f compose.build.yaml build
docker compose -f compose.yaml -f compose.build.yaml push
```

Copy `compose.yaml` and `.env` to `/apps/finapp/` on the server. From that folder:

```sh
sudo docker compose pull
sudo docker compose up -d --wait
```

For later releases, publish a new tag, update the server's `IMAGE_VERSION`, and
repeat the pull and up commands. Keep older tags to support rollback. Do not
put registry credentials in `.env`; use `docker login` if the image is private.

The current GCP deployment is `fin-instance`, with Compose and `.env` in
`/apps/finapp/`, using `excsi/finapp:2026.10.10-1`. Nginx terminates HTTPS at
`https://34.95.8.204` and forwards every HTTPS path to the container on
`127.0.0.1:3001`, including future API routes and WebSocket connections. HTTP
redirects preserve the request method with status 308; the HTTP ACME challenge
path remains available for certificate renewal. The previous static deployment
was archived under `/apps/backups/` before removal from the app directory.

For a plain Docker image without Compose, build from the repository root:

```sh
docker build -f backend/Dockerfile -t yourname/finapp:2026.10.10-1 .
docker run --rm -p 127.0.0.1:3001:3000 yourname/finapp:2026.10.10-1
```

## Nginx integration

When routing the live site through this server, run it as a managed service or
Compose container and replace the HTTPS server's static `location /` block with:

```nginx
location / {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $finapp_connection_upgrade;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Port 3001 is the Compose default. Use 3000 instead if running `npm start`
directly, or the configured host port if you set `FINAPP_PORT`.

Preserve the existing HTTP ACME challenge location, HTTPS certificate settings,
and certificate renewal hooks. Validate with `nginx -t` before reloading.

For WebSocket support, place this map inside Nginx's `http` context (for example,
in `/etc/nginx/conf.d/finapp-upgrade.conf`):

```nginx
map $http_upgrade $finapp_connection_upgrade {
    default upgrade;
    '' close;
}
```

Proxy every HTTPS path, including future `/api/*` routes, rather than adding
static-file exceptions. Port 80 retains the ACME challenge path and redirects
other requests to HTTPS.

This server only serves the frontend. Gemini and ElevenLabs currently retain
their existing browser behavior; no API proxy or server-side secret storage is
implemented here.
