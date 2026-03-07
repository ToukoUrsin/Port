# CORS — Implementation Spec

**Layer:** Gin middleware (`backend/internal/middleware/cors.go`)
**Dependency:** `github.com/gin-contrib/cors v1.7+`

---

## Overview

CORS controls which browser origins can call the backend API. Since the contributor PWA and reader site run on different origins from the Gin backend, the browser blocks requests unless the backend explicitly allows them.

```
Contributor PWA (localhost:5173)  ──→  OPTIONS preflight  ──→  Backend (localhost:8000)
                                  ←──  Access-Control-Allow-Origin: localhost:5173
                                  ──→  POST /api/submissions
                                  ←──  200 + CORS headers

Reader site (localhost:5174)      ──→  same pattern
```

SSE streams (`EventSource`) are GET requests — they don't trigger preflight but still need the `Access-Control-Allow-Origin` header in the response.

---

## Environment

```bash
# .env
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174
# Production example:
# ALLOWED_ORIGINS=https://contribute.localnews.app,https://localnews.app
```

Comma-separated list. No trailing slashes. No wildcards in production.

---

## Configuration

```go
// internal/middleware/cors.go

package middleware

import (
    "os"
    "strings"
    "time"

    "github.com/gin-contrib/cors"
    "github.com/gin-gonic/gin"
)

func SetupCORS(r *gin.Engine) {
    origins := strings.Split(os.Getenv("ALLOWED_ORIGINS"), ",")
    for i := range origins {
        origins[i] = strings.TrimSpace(origins[i])
    }

    r.Use(cors.New(cors.Config{
        AllowOrigins:     origins,
        AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
        AllowHeaders:     allowedHeaders,
        ExposeHeaders:    exposedHeaders,
        AllowCredentials: true,
        MaxAge:           12 * time.Hour,
    }))
}

var allowedHeaders = []string{
    "Origin",
    "Content-Type",
    "Authorization",       // JWT access token
    "Accept",
    "X-Request-ID",        // client-generated request tracing
}

var exposedHeaders = []string{
    "X-Request-ID",        // echo back for client-side correlation
}
```

---

## Header Behavior

What the middleware adds to responses:

| Header | Value | When |
|--------|-------|------|
| `Access-Control-Allow-Origin` | The matching origin from `ALLOWED_ORIGINS` | Every response to a listed origin |
| `Access-Control-Allow-Methods` | `GET, POST, PUT, DELETE, OPTIONS` | Preflight responses |
| `Access-Control-Allow-Headers` | `Origin, Content-Type, Authorization, Accept, X-Request-ID` | Preflight responses |
| `Access-Control-Expose-Headers` | `X-Request-ID` | Every response |
| `Access-Control-Allow-Credentials` | `true` | Every response (needed for httpOnly refresh cookie) |
| `Access-Control-Max-Age` | `43200` (12 hours) | Preflight responses (browsers cache preflight result) |
| `Vary` | `Origin` | Every response (set by gin-contrib/cors automatically) |

### Why `AllowCredentials: true`

The auth layer uses httpOnly cookies for refresh tokens (`__Host-refresh`). Browsers only send cookies cross-origin if:
1. The server responds with `Access-Control-Allow-Credentials: true`
2. The client sets `credentials: "include"` on fetch (or `withCredentials: true` on XHR)
3. `Access-Control-Allow-Origin` is NOT `*` (must be an explicit origin)

This is why we list explicit origins instead of using a wildcard.

### Frontend fetch configuration

All API calls from the frontend must include credentials:

```typescript
// api/client.ts
const res = await fetch(`${API_BASE}/api/submissions`, {
    method: "POST",
    body: formData,
    credentials: "include",   // REQUIRED — sends refresh cookie
});
```

`EventSource` does not support `credentials` by default. For SSE endpoints that need auth, use `fetch` with `credentials: "include"` and read the stream manually, or pass the access token as a query parameter (less ideal). For the MVP pipeline stream (which uses cookie-based auth lookup), the standard `EventSource` works if the browser sends cookies for same-site requests behind nginx.

---

## Preflight Handling

Browsers send an `OPTIONS` preflight request before any "non-simple" request. Non-simple means:
- Method other than GET/HEAD/POST
- Content-Type other than `application/x-www-form-urlencoded`, `multipart/form-data`, `text/plain`
- Any custom header (e.g., `Authorization`)

So every authenticated API call triggers a preflight. The `MaxAge: 12h` setting tells browsers to cache the preflight result, avoiding repeated OPTIONS requests.

`gin-contrib/cors` handles OPTIONS automatically — it responds with the CORS headers and a `204 No Content`, never reaching route handlers.

---

## SSE Streams and CORS

`EventSource` makes a simple GET request with `Accept: text/event-stream`. This is a "simple request" (no custom headers, GET method), so **no preflight** is triggered.

However, the response still needs `Access-Control-Allow-Origin` to be readable by the frontend. The CORS middleware adds this to all responses, including SSE streams.

If the SSE endpoint requires authentication via `Authorization` header instead of cookies, `EventSource` can't set custom headers — use a polyfill or manual `fetch` with `ReadableStream`:

```typescript
// For auth-required SSE (if not using cookies)
const res = await fetch(`${API_BASE}/api/submissions/${id}/stream`, {
    headers: { "Authorization": `Bearer ${accessToken}` },
    credentials: "include",
});
const reader = res.body!.getReader();
const decoder = new TextDecoder();
// ... read SSE events from stream
```

---

## Request Flow (with Nginx)

When nginx sits in front:

```
Browser  ──→  nginx (port 443)  ──→  Gin (port 8000)
                                 ←──  Response + CORS headers
         ←──  Forwarded response + CORS headers
```

CORS headers are set by Gin, not nginx. Nginx passes them through. Do NOT add CORS headers in nginx — that causes duplicate headers and breaks browsers.

The one exception: if nginx serves the frontend static files AND proxies to the backend, all requests from the frontend to `/api/*` are same-origin (same host:port), and CORS isn't needed at all. See `NGINX_SPEC.md` for this setup.

---

## Security Rules

| Rule | Reason |
|------|--------|
| No wildcard `*` origins | Wildcards disable `credentials: "include"`, breaking cookie-based auth |
| No `Access-Control-Allow-Origin: null` | The `null` origin is spoofable — never allow it |
| Explicit origin list only | Each origin is validated against the allowlist per-request |
| No `Access-Control-Allow-Headers: *` | Enumerate allowed headers explicitly |
| `Vary: Origin` always set | Required for correct CDN/proxy caching when origin differs per request |

---

## Local Dev vs Production

| Setting | Local Dev | Production |
|---------|-----------|------------|
| `ALLOWED_ORIGINS` | `http://localhost:5173,http://localhost:5174` | `https://contribute.localnews.app,https://localnews.app` |
| `AllowCredentials` | `true` | `true` |
| `MaxAge` | `12h` | `12h` |
| Wildcard | Never | Never |

In production behind nginx with a single domain, the frontend is served from the same origin as the API (nginx routes `/api/*` to Gin, everything else to static files). In that case CORS headers are technically unnecessary — but keep them configured as a safety net for development and any future subdomain splits.
