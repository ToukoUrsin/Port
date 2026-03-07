# Nginx — Reverse Proxy & Static Serving Spec

**Role:** TLS termination, reverse proxy to Gin, static file serving for frontend, upload limits, connection tuning
**Config location:** `deploy/nginx/nginx.conf` (repo) → `/etc/nginx/sites-available/localnews` (server)

---

## Overview

Nginx is the single entry point. All traffic hits nginx on port 443 (HTTPS) or 80 (redirect). Nginx decides what to do based on the URL path:

```
Internet
    |
    v
┌──────────────────────────────────────────────────────┐
│  nginx (port 443)                                    │
│                                                      │
│  /api/*          →  proxy_pass http://gin:8000       │
│  /uploads/*      →  serve from /var/data/uploads/    │
│  /*              →  serve from /var/www/frontend/     │
│                     (SPA fallback to index.html)     │
└──────────┬──────────────┬──────────────────────────────┘
           │              │
           v              v
    ┌────────────┐  ┌────────────────┐
    │ Gin :8000  │  │ Static files   │
    │ (backend)  │  │ (Vite build)   │
    └────────────┘  └────────────────┘
```

This means:
- **No CORS needed in production** — frontend and API share the same origin
- **TLS terminates at nginx** — Gin receives plain HTTP on localhost
- **Static files served fast** — nginx handles them directly, Gin never sees them
- **Single domain** — `localnews.app` serves everything

---

## Full Configuration

```nginx
# /etc/nginx/sites-available/localnews

# Rate limiting zones
limit_req_zone $binary_remote_addr zone=auth:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=api:10m rate=30r/s;
limit_req_zone $binary_remote_addr zone=uploads:10m rate=5r/s;

# Upstream backend
upstream gin_backend {
    server 127.0.0.1:8000;
    keepalive 32;
}

# HTTP → HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name localnews.app;
    return 301 https://$host$request_uri;
}

# Main HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name localnews.app;

    # ─── TLS ────────────────────────────────────────────
    ssl_certificate     /etc/letsencrypt/live/localnews.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/localnews.app/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers on;
    ssl_session_cache   shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_stapling        on;
    ssl_stapling_verify on;

    # ─── Security headers ───────────────────────────────
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(self), microphone=(self), geolocation=(self)" always;

    # ─── Global limits ──────────────────────────────────
    client_max_body_size 25m;       # max upload: audio + 5 photos

    # ─── API proxy ──────────────────────────────────────
    location /api/ {
        limit_req zone=api burst=20 nodelay;

        proxy_pass         http://gin_backend;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   Connection        "";

        # Timeouts — generous for AI pipeline (~30s)
        proxy_connect_timeout  5s;
        proxy_send_timeout     30s;
        proxy_read_timeout     120s;   # SSE streams can be long-lived
    }

    # ─── SSE streams (separate block for tuning) ───────
    location ~ ^/api/submissions/[^/]+/stream$ {
        limit_req zone=api burst=10 nodelay;

        proxy_pass         http://gin_backend;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   Connection        "";

        # SSE-specific: disable buffering so events flush immediately
        proxy_buffering    off;
        proxy_cache        off;
        proxy_read_timeout 300s;       # pipeline takes ~30s, 5min safety margin
        chunked_transfer_encoding on;

        # Required: tell nginx not to buffer SSE
        add_header X-Accel-Buffering no;
    }

    # ─── Auth endpoints (stricter rate limit) ──────────
    location ~ ^/api/auth/(login|register|refresh)$ {
        limit_req zone=auth burst=5 nodelay;

        proxy_pass         http://gin_backend;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   Connection        "";

        proxy_connect_timeout 5s;
        proxy_send_timeout    10s;
        proxy_read_timeout    10s;
    }

    # ─── File uploads (submission media) ────────────────
    location /api/submissions {
        limit_req zone=uploads burst=3 nodelay;

        client_max_body_size 25m;      # override for this location specifically
        proxy_request_buffering off;   # stream uploads to Gin, don't buffer in nginx

        proxy_pass         http://gin_backend;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   Connection        "";

        proxy_connect_timeout 5s;
        proxy_send_timeout    60s;     # large uploads on slow connections
        proxy_read_timeout    30s;
    }

    # ─── Uploaded media files (served directly by nginx) ─
    location /uploads/ {
        alias /var/data/localnews/uploads/;
        expires 7d;
        add_header Cache-Control "public, immutable";
        add_header X-Content-Type-Options "nosniff" always;

        # Only serve expected media types
        location ~* \.(jpg|jpeg|png|webp|gif|mp3|mp4|webm|ogg|m4a)$ {
            # matched — serve file
        }
        # Block everything else
        return 403;
    }

    # ─── Frontend SPA ───────────────────────────────────
    location / {
        root /var/www/localnews/frontend;
        try_files $uri $uri/ /index.html;

        # Cache static assets aggressively (Vite adds content hashes)
        location ~* \.(js|css|woff2?|svg|png|jpg|ico)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # Don't cache index.html (SPA entry point)
        location = /index.html {
            expires -1;
            add_header Cache-Control "no-store, no-cache, must-revalidate";
        }
    }
}
```

---

## Location Routing Summary

| Path | Handler | Rate Limit | Timeout | Notes |
|------|---------|-----------|---------|-------|
| `/api/auth/(login\|register\|refresh)` | Proxy → Gin | 10 req/s, burst 5 | 10s | Strictest rate limit |
| `/api/submissions` (POST) | Proxy → Gin | 5 req/s, burst 3 | 60s send | Large uploads, unbuffered |
| `/api/submissions/*/stream` | Proxy → Gin | 30 req/s, burst 10 | 300s read | SSE, buffering disabled |
| `/api/*` (everything else) | Proxy → Gin | 30 req/s, burst 20 | 120s read | General API |
| `/uploads/*` | Static files | None | N/A | Media files, 7-day cache |
| `/*` | Static files | None | N/A | SPA with `try_files` fallback |

---

## SSE Proxy Rules

SSE breaks if nginx buffers the response. Three directives are critical:

```nginx
proxy_buffering    off;     # don't buffer response body
proxy_cache        off;     # don't cache SSE responses
proxy_read_timeout 300s;    # keep connection open for long-running pipelines
```

Without these, SSE events queue up in nginx's buffer and arrive in batches instead of real-time, or the connection times out mid-pipeline.

The `X-Accel-Buffering: no` header is a fallback — it tells nginx to disable buffering even if `proxy_buffering` is on at a higher level.

---

## Rate Limiting

Three zones, sized for different abuse profiles:

| Zone | Rate | Burst | Protects |
|------|------|-------|----------|
| `auth` | 10 req/s per IP | 5 | Brute-force login/register |
| `api` | 30 req/s per IP | 20 | General API abuse |
| `uploads` | 5 req/s per IP | 3 | Storage abuse via rapid uploads |

`nodelay` means burst requests are served immediately (not queued). Once the burst is exhausted, excess requests get `503`.

The `10m` shared memory zone holds ~160k IP addresses — enough for any reasonable deployment.

---

## Upload Handling

```nginx
client_max_body_size  25m;              # reject uploads over 25MB at nginx level
proxy_request_buffering off;            # stream to Gin, don't buffer entire upload in nginx memory
```

Budget: 1 audio file (~5MB for 2 min WebM) + 5 photos (~3MB each) = ~20MB max. The 25MB limit adds headroom.

`proxy_request_buffering off` means nginx forwards upload bytes to Gin as they arrive, instead of buffering the entire body to disk first. This reduces latency and disk I/O for large uploads.

---

## TLS Configuration

- **Certificates:** Let's Encrypt via certbot. Auto-renewed.
- **Protocols:** TLS 1.2 and 1.3 only. TLS 1.0/1.1 disabled (insecure).
- **OCSP stapling:** Enabled — nginx fetches certificate status and staples it to the TLS handshake, avoiding client-side OCSP lookups.
- **HSTS:** 2-year max-age with `includeSubDomains` and `preload`.

### Certbot setup

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d localnews.app
# Auto-renewal is set up by certbot via systemd timer
```

---

## Security Headers

| Header | Value | Purpose |
|--------|-------|---------|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Force HTTPS for 2 years |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME-type sniffing |
| `X-Frame-Options` | `DENY` | Block embedding in iframes (clickjacking) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limit referrer leakage |
| `Permissions-Policy` | `camera=(self), microphone=(self), geolocation=(self)` | Allow camera/mic for contributor PWA, block for third-party embeds |

Note: `Permissions-Policy` allows `camera` and `microphone` for same-origin only — this is required for the audio recorder and photo capture components.

---

## Caching Strategy

| Resource | Cache | Reasoning |
|----------|-------|-----------|
| `/api/*` | No cache | Dynamic data, CORS-varied |
| `/uploads/*` media | 7 days, `immutable` | Uploaded files never change (UUID-named) |
| `*.js, *.css` (hashed) | 1 year, `immutable` | Vite adds content hashes to filenames |
| `index.html` | `no-store` | Must always fetch latest to pick up new JS/CSS hashes |
| `*.woff2, *.svg, *.png` | 1 year, `immutable` | Static assets with hashed names |

---

## Proxy Headers

Every proxied request to Gin includes:

| Header | Value | Purpose |
|--------|-------|---------|
| `Host` | `$host` | Original hostname |
| `X-Real-IP` | `$remote_addr` | Client's real IP (for logging, rate limiting in Gin) |
| `X-Forwarded-For` | `$proxy_add_x_forwarded_for` | Full proxy chain |
| `X-Forwarded-Proto` | `$scheme` | `https` — so Gin knows the original protocol |
| `Connection` | `""` | Enables HTTP/1.1 keepalive to upstream |

Gin reads `X-Real-IP` for request logging and any application-level rate limiting. The backend must trust these headers since they come from nginx on localhost — configure Gin's trusted proxies:

```go
// cmd/server/main.go
r := gin.Default()
r.SetTrustedProxies([]string{"127.0.0.1", "::1"})
```

---

## Connection Tuning

```nginx
upstream gin_backend {
    server 127.0.0.1:8000;
    keepalive 32;              # persistent connections to Gin
}
```

`keepalive 32` maintains up to 32 idle connections to the Gin backend, avoiding TCP handshake overhead per request. Combined with `proxy_http_version 1.1` and `Connection ""`, this enables HTTP/1.1 keepalive between nginx and Gin.

---

## File Structure

```
deploy/
└── nginx/
    ├── nginx.conf              # Main config (the one above)
    ├── nginx.dev.conf          # Local dev config (HTTP only, no TLS)
    └── mime.types              # Only if customizing beyond nginx defaults
```

### Dev Config (no TLS, local ports)

For local development, a simplified config that skips TLS:

```nginx
# deploy/nginx/nginx.dev.conf

upstream gin_backend {
    server 127.0.0.1:8000;
}

server {
    listen 3000;
    server_name localhost;

    client_max_body_size 25m;

    # API proxy
    location /api/ {
        proxy_pass         http://gin_backend;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   Connection        "";
    }

    # SSE — disable buffering
    location ~ ^/api/submissions/[^/]+/stream$ {
        proxy_pass         http://gin_backend;
        proxy_http_version 1.1;
        proxy_buffering    off;
        proxy_cache        off;
        proxy_read_timeout 300s;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   Connection        "";
    }

    # Uploads served directly
    location /uploads/ {
        alias ./uploads/;
    }

    # Frontend dev server proxy (Vite)
    location / {
        proxy_pass http://127.0.0.1:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";     # WebSocket for Vite HMR
        proxy_set_header Host $host;
    }
}
```

In dev mode, nginx proxies to both Vite (`:5173`) and Gin (`:8000`), unifying them on a single port (`:3000`). This eliminates CORS entirely during local development — everything is same-origin.

---

## CORS Interaction

| Setup | CORS Needed? | Why |
|-------|-------------|-----|
| **Dev without nginx** — Vite on `:5173`, Gin on `:8000` | Yes | Different ports = different origins |
| **Dev with nginx** — everything on `:3000` | No | Same origin, nginx routes internally |
| **Production** — nginx on `:443`, serves frontend + proxies API | No | Same origin (`localnews.app`) |

The CORS middleware in Gin should still be configured (see `CORS_SPEC.md`) as a fallback — it's harmless when same-origin and protects against accidental direct-to-backend access. But nginx is the primary reason CORS isn't an issue in production.

---

## Deployment Checklist

```bash
# 1. Install nginx
sudo apt install nginx

# 2. Copy config
sudo cp deploy/nginx/nginx.conf /etc/nginx/sites-available/localnews
sudo ln -s /etc/nginx/sites-available/localnews /etc/nginx/sites-enabled/

# 3. TLS
sudo certbot --nginx -d localnews.app

# 4. Create directories
sudo mkdir -p /var/www/localnews/frontend
sudo mkdir -p /var/data/localnews/uploads

# 5. Deploy frontend
cd frontend && npm run build
sudo cp -r dist/* /var/www/localnews/frontend/

# 6. Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

---

## Health Check

For uptime monitoring or load balancer health checks, add a dedicated route that bypasses rate limiting:

```nginx
location = /health {
    proxy_pass http://gin_backend/api/health;
    access_log off;
}
```

With a corresponding Gin endpoint:

```go
r.GET("/api/health", func(c *gin.Context) {
    c.JSON(200, gin.H{"status": "ok"})
})
```
