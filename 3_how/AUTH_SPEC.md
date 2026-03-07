# Authentication & Authorization — Implementation Spec

**Layer:** Go / Gin middleware · JWT (access + refresh) · bcrypt · Google OAuth · Redis cache
**Fits into:** `backend/internal/middleware/auth.go`, `backend/internal/handlers/auth.go`, `backend/internal/services/auth.go`, `backend/internal/cache/redis.go`

---

## Overview

Stateless JWT auth. No server-side sessions. All token validation happens per-request via middleware. Refresh tokens are stored hashed in PostgreSQL for revocation support. Redis sits in front of PostgreSQL for fast auth lookups — profile data, revocation checks, and permission resolution hit cache first.

```
Client                     Backend                      Redis           DB
  |                          |                            |              |
  |-- POST /auth/register → |-- bcrypt hash password --→ |              | profiles row
  |<-- { access, refresh } --|-- sign JWT + store ------→ | cache profile| refresh_tokens row
  |                          |                            |              |
  |-- GET /api/articles ---→ |                            |              |
  |   Authorization: Bearer  |-- verify JWT signature     |              |
  |                          |-- check revocation ------→ | HIT/MISS     |
  |                          |-- load profile if needed → | HIT ------→  | MISS → DB fallback
  |<-- 200 data ------------ |                            |              |
  |                          |                            |              |
  |-- POST /auth/refresh --→ |-- hash refresh token       |              |
  |                          |-- lookup token hash -----→ | HIT/MISS --→ | refresh_tokens
  |                          |-- rotate tokens ---------→ | invalidate   | revoke old, insert new
  |<-- { access, refresh } --|                            |              |
```

---

## Token Design

### Access Token (JWT)

- **Algorithm:** HS256 (single backend; switch to RS256 if multi-service)
- **Lifetime:** 15 minutes
- **Stored:** Client memory only (never localStorage)
- **Signing key:** `JWT_SECRET` env var (min 32 bytes, random)

**Claims:**

```json
{
  "sub": "profile-uuid",
  "role": 0,
  "perm": 0,
  "iat": 1709827200,
  "exp": 1709828100
}
```

| Claim | Type | Source |
|-------|------|--------|
| `sub` | string (UUID) | `profiles.id` |
| `role` | int | `profiles.role` — 0=contributor, 1=editor, 2=admin |
| `perm` | int64 | `profiles.permissions` — bitmask for granular checks |
| `iat` | int64 | Issued-at unix timestamp |
| `exp` | int64 | Expiry unix timestamp |

No sensitive data in the token. Role and permissions are copied at issuance — if a user's role changes, new tokens reflect it on next refresh.

### Refresh Token

- **Format:** 32 random bytes, base64url-encoded (44 chars)
- **Lifetime:** 30 days
- **Stored server-side:** SHA-256 hash in `refresh_tokens.token_hash`
- **Stored client-side:** httpOnly secure cookie (`__Host-refresh`)
- **Rotation:** Every use issues a new refresh token and revokes the old one

---

## Environment Variables

```bash
JWT_SECRET=<random-32+-bytes-base64>    # REQUIRED — signing key for access tokens
JWT_ACCESS_TTL=15m                       # optional, default 15m
JWT_REFRESH_TTL=720h                     # optional, default 30 days
REDIS_URL=redis://localhost:6379/0       # REQUIRED — Redis connection string
GOOGLE_CLIENT_ID=...                     # for OAuth
GOOGLE_CLIENT_SECRET=...                 # for OAuth
GOOGLE_REDIRECT_URL=http://localhost:8000/api/auth/google/callback
```

---

## API Endpoints

All under `/api/auth/`. No endpoint requires auth unless noted.

### `POST /api/auth/register`

Create a new account with email + password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "minimum8chars",
  "display_name": "Anna Svensson"
}
```

**Validation:**
- `email` — required, valid format, unique (409 if taken)
- `password` — required, min 8 chars
- `display_name` — optional, max 200 chars

**Process:**
1. Validate input
2. Check email uniqueness → 409 Conflict if exists
3. `bcrypt.GenerateFromPassword(password, bcrypt.DefaultCost)`
4. Insert `profiles` row
5. Generate access token + refresh token
6. Store refresh token hash in `refresh_tokens`
7. Return access token in body, refresh token in httpOnly cookie

**Response (201):**
```json
{
  "access_token": "eyJ...",
  "profile": {
    "id": "uuid",
    "email": "user@example.com",
    "display_name": "Anna Svensson",
    "role": 0
  }
}
```

**Errors:** 400 validation, 409 email taken, 500 internal

---

### `POST /api/auth/login`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "..."
}
```

**Process:**
1. Look up profile by email → 401 if not found
2. `bcrypt.CompareHashAndPassword` → 401 if mismatch
3. Generate access + refresh tokens
4. Store refresh token hash
5. Return same shape as register

**Response (200):** Same as register.

**Errors:** 401 invalid credentials (same message for wrong email or wrong password)

---

### `POST /api/auth/refresh`

Rotate refresh token and issue new access token. Refresh token comes from the httpOnly cookie.

**Process:**
1. Read `__Host-refresh` cookie → 401 if missing
2. SHA-256 hash the token
3. Look up `refresh_tokens` by hash where `revoked = false` and `expires_at > now()` → 401 if not found
4. Revoke the old token (`revoked = true`)
5. Generate new access + refresh tokens
6. Store new refresh token hash
7. Return new access token, set new cookie

**Response (200):**
```json
{
  "access_token": "eyJ..."
}
```

**Errors:** 401 invalid/expired refresh token

**Reuse detection:** If a revoked refresh token is presented, revoke ALL tokens for that profile (potential theft). Return 401.

---

### `POST /api/auth/logout`

Requires auth.

**Process:**
1. Read refresh token from cookie
2. Revoke it in DB
3. Clear the cookie

**Response:** 204 No Content

---

### `GET /api/auth/google`

Redirect to Google OAuth consent screen.

**Process:**
1. Generate random `state` parameter (32 bytes, base64url)
2. Store state in a short-lived httpOnly cookie (`__Host-oauth-state`, 10 min TTL)
3. Redirect to `https://accounts.google.com/o/oauth2/v2/auth` with:
   - `client_id`, `redirect_uri`, `response_type=code`
   - `scope=openid email profile`
   - `state=<generated>`

---

### `GET /api/auth/google/callback`

Google redirects here after consent.

**Process:**
1. Validate `state` param matches cookie → 400 if mismatch
2. Exchange `code` for tokens at Google's token endpoint
3. Fetch user info from `https://www.googleapis.com/oauth2/v2/userinfo`
4. Look up `oauth_accounts` by `(provider=1, provider_uid=google_sub)`
   - **Exists:** Load linked profile
   - **Not exists, email matches existing profile:** Link OAuth account to existing profile
   - **Not exists, new email:** Create profile (no password) + oauth_account row
5. Generate access + refresh tokens
6. Redirect to frontend with access token as URL fragment: `{frontend_url}/auth/callback#token={access_token}`
   - Refresh token set in httpOnly cookie

---

## Middleware

### `Auth()` — Required authentication

Extracts and validates the JWT from the `Authorization: Bearer <token>` header.

```go
// middleware/auth.go

func Auth(jwtSecret []byte) gin.HandlerFunc {
    return func(c *gin.Context) {
        header := c.GetHeader("Authorization")
        if !strings.HasPrefix(header, "Bearer ") {
            c.AbortWithStatusJSON(401, gin.H{"error": "missing token"})
            return
        }
        tokenStr := header[7:]

        claims, err := validateAccessToken(tokenStr, jwtSecret)
        if err != nil {
            c.AbortWithStatusJSON(401, gin.H{"error": "invalid token"})
            return
        }

        c.Set("profile_id", claims.Subject)
        c.Set("role", claims.Role)
        c.Set("perm", claims.Perm)
        c.Next()
    }
}
```

Sets three context keys for downstream handlers:
- `profile_id` (string) — UUID of the authenticated user
- `role` (int) — role level
- `perm` (int64) — permission bitmask

### `OptionalAuth()` — Auth if present, continue if not

Same as `Auth()` but does not abort on missing/invalid token. Sets context keys only if valid token present. Useful for public endpoints that behave differently for logged-in users.

### `RequireRole(minRole int)` — Role gate

Must be chained after `Auth()`.

```go
func RequireRole(minRole int) gin.HandlerFunc {
    return func(c *gin.Context) {
        role, _ := c.Get("role")
        if role.(int) < minRole {
            c.AbortWithStatusJSON(403, gin.H{"error": "insufficient permissions"})
            return
        }
        c.Next()
    }
}
```

### `RequirePerm(flag int64)` — Permission bitmask gate

For granular permissions beyond role level.

```go
func RequirePerm(flag int64) gin.HandlerFunc {
    return func(c *gin.Context) {
        perm, _ := c.Get("perm")
        if perm.(int64)&flag == 0 {
            c.AbortWithStatusJSON(403, gin.H{"error": "insufficient permissions"})
            return
        }
        c.Next()
    }
}
```

---

## Redis Cache Layer

Redis accelerates every authenticated request by caching auth-related data. The backend never hits PostgreSQL for routine token validation or profile lookups during a cache hit.

### Cache Keys & TTLs

| Key Pattern | Value | TTL | Written On | Invalidated On |
|-------------|-------|-----|-----------|----------------|
| `profile:{id}` | JSON: `{role, perm, email, display_name}` | 15 min | Login, register, refresh, profile update | Profile update, role/perm change, logout |
| `revoked:{token_hash}` | `"1"` | Equal to token's remaining TTL | Token revocation | Expires naturally |
| `refresh:{token_hash}` | JSON: `{profile_id, expires_at}` | Match DB `expires_at` | Token creation | Rotation (old deleted, new created) |
| `ratelimit:login:{ip}` | Counter | 15 min (sliding window) | Each login attempt | Expires naturally |

### Cache Flow — Auth Middleware

On every authenticated request:

```go
// middleware/auth.go — inside Auth()

// 1. Parse + verify JWT signature (pure crypto, no I/O)
claims := validateAccessToken(tokenStr, jwtSecret)

// 2. Check if token is revoked (Redis first)
revoked, err := cache.Exists(ctx, "revoked:"+tokenJTI)
if revoked {
    // 401 — token was explicitly revoked
    return
}

// 3. Load profile from cache (Redis first, DB fallback)
profile, err := cache.GetProfile(ctx, claims.Subject)
if err == cache.Miss {
    profile = db.FindProfile(claims.Subject)
    cache.SetProfile(ctx, profile, 15*time.Minute)
}

// 4. Use cached role/perm (may be fresher than JWT claims)
// This catches role changes between token issuance and expiry
c.Set("role", profile.Role)
c.Set("perm", profile.Perm)
```

**Why check cache profile instead of just JWT claims?** If an admin revokes a user's permissions or changes their role, the JWT still has the old values until it expires (up to 15 min). The cached profile reflects the latest DB state, so permission checks use cache values, not JWT claims. The JWT is only used for identity (`sub`) and signature verification.

### Cache Flow — Refresh Token Rotation

```
1. Hash incoming token
2. GET refresh:{hash} from Redis
   - HIT  → use cached {profile_id, expires_at}, skip DB lookup
   - MISS → query refresh_tokens table, return 401 if not found
3. DEL refresh:{old_hash}                    — remove old from cache
4. SET revoked:{old_hash} "1" EX {remaining} — block reuse
5. SET refresh:{new_hash} {profile_id, ...}  — cache new token
6. Write new row + revoke old row in DB      — source of truth
```

### Cache Flow — Revocation Events

When tokens need to be invalidated (logout, password change, suspicious reuse):

```go
// Logout: revoke single refresh token
cache.Del(ctx, "refresh:"+tokenHash)
cache.Set(ctx, "revoked:"+tokenHash, "1", remainingTTL)

// Suspicious reuse: revoke ALL tokens for profile
tokens := db.FindAllRefreshTokens(profileID)
for _, t := range tokens {
    cache.Del(ctx, "refresh:"+hex(t.TokenHash))
    cache.Set(ctx, "revoked:"+hex(t.TokenHash), "1", remainingTTL)
}
cache.Del(ctx, "profile:"+profileID)
```

### Cache Invalidation Rules

| Event | Cache Action |
|-------|-------------|
| Login / Register | `SET profile:{id}`, `SET refresh:{hash}` |
| Refresh rotation | `DEL refresh:{old}`, `SET revoked:{old}`, `SET refresh:{new}`, `SET profile:{id}` |
| Logout | `DEL refresh:{hash}`, `SET revoked:{hash}`, `DEL profile:{id}` |
| Password change | Revoke all refresh tokens + `DEL profile:{id}` |
| Role/perm change (admin) | `DEL profile:{id}` (forces re-fetch from DB on next request) |
| Profile update | `DEL profile:{id}` |

### Cache Miss Behavior

Redis is a **read-through cache**, not a requirement. If Redis is down:

1. JWT signature verification still works (pure crypto)
2. Revocation checks fall back to DB query on `refresh_tokens`
3. Profile lookups fall back to DB query on `profiles`
4. Performance degrades but auth still functions

This is implemented with a simple fallback pattern — every cache read has a DB fallback path.

### Implementation (`cache/redis.go`)

```go
// internal/cache/redis.go

type Cache struct {
    client *redis.Client
}

func New(redisURL string) (*Cache, error)

// Profile cache
func (c *Cache) GetProfile(ctx context.Context, profileID string) (*CachedProfile, error)
func (c *Cache) SetProfile(ctx context.Context, profile *CachedProfile, ttl time.Duration) error
func (c *Cache) DelProfile(ctx context.Context, profileID string) error

// Refresh token cache
func (c *Cache) GetRefreshToken(ctx context.Context, tokenHash string) (*CachedRefresh, error)
func (c *Cache) SetRefreshToken(ctx context.Context, tokenHash string, data *CachedRefresh, ttl time.Duration) error
func (c *Cache) DelRefreshToken(ctx context.Context, tokenHash string) error

// Revocation
func (c *Cache) MarkRevoked(ctx context.Context, tokenHash string, ttl time.Duration) error
func (c *Cache) IsRevoked(ctx context.Context, tokenHash string) (bool, error)
```

```go
type CachedProfile struct {
    Role        int    `json:"role"`
    Perm        int64  `json:"perm"`
    Email       string `json:"email"`
    DisplayName string `json:"display_name"`
}

type CachedRefresh struct {
    ProfileID string `json:"profile_id"`
    ExpiresAt int64  `json:"expires_at"`
}
```

---

## Permission Bitmask

Defined as constants. Each bit is a capability.

```go
// models/permissions.go

const (
    PermSubmit        int64 = 1 << 0  // create submissions
    PermPublish       int64 = 1 << 1  // publish articles
    PermModerate      int64 = 1 << 2  // moderate content / replies
    PermManageUsers   int64 = 1 << 3  // edit other profiles, change roles
    PermManageLocations int64 = 1 << 4  // create/edit locations
)
```

Default permissions by role:

| Role | Value | Default Permissions |
|------|-------|-------------------|
| Contributor | 0 | `PermSubmit` |
| Editor | 1 | `PermSubmit \| PermPublish \| PermModerate` |
| Admin | 2 | All bits set |

Permissions are set on the profile row and baked into the JWT. The bitmask allows granting specific capabilities independent of role (e.g., a contributor who can also publish).

---

## Route Protection Map

How middleware applies to existing + new routes:

```go
// cmd/server/main.go (router setup)

public := r.Group("/api")
{
    public.POST("/auth/register", h.Register)
    public.POST("/auth/login", h.Login)
    public.POST("/auth/refresh", h.Refresh)
    public.GET("/auth/google", h.GoogleRedirect)
    public.GET("/auth/google/callback", h.GoogleCallback)

    public.GET("/articles", h.ListArticles)
    public.GET("/articles/:id", h.GetArticle)
    public.GET("/search", h.Search)
    public.GET("/locations/:slug/articles", h.LocationArticles)
}

authed := r.Group("/api", middleware.Auth(jwtSecret))
{
    authed.POST("/submissions", h.CreateSubmission)
    authed.GET("/submissions/:id/stream", h.StreamPipeline)
    authed.POST("/auth/logout", h.Logout)
}

editor := r.Group("/api", middleware.Auth(jwtSecret), middleware.RequireRole(1))
{
    editor.POST("/articles/:id/publish", h.PublishArticle)
}
```

---

## File Structure

New and modified files:

```
backend/internal/
├── cache/
│   └── redis.go             # NEW — Redis client, profile/token/revocation cache ops
├── middleware/
│   ├── cors.go              # existing
│   └── auth.go              # NEW — Auth, OptionalAuth, RequireRole, RequirePerm
├── handlers/
│   ├── auth.go              # NEW — Register, Login, Refresh, Logout, Google*
│   └── submissions.go       # MODIFY — read profile_id from context
├── services/
│   └── auth.go              # NEW — token generation, password hashing, refresh rotation
└── models/
    ├── profile.go           # existing schema
    └── permissions.go       # NEW — permission constants
```

---

## Service Layer (`services/auth.go`)

Core functions:

```go
type AuthService struct {
    db         *gorm.DB
    cache      *cache.Cache
    jwtSecret  []byte
    accessTTL  time.Duration
    refreshTTL time.Duration
}

// Password
func (s *AuthService) HashPassword(password string) ([]byte, error)
func (s *AuthService) CheckPassword(hash []byte, password string) error

// Access tokens
func (s *AuthService) GenerateAccessToken(profile *models.Profile) (string, error)
func (s *AuthService) ValidateAccessToken(tokenStr string) (*Claims, error)

// Refresh tokens
func (s *AuthService) GenerateRefreshToken(profileID uuid.UUID, meta map[string]string) (rawToken string, err error)
func (s *AuthService) RotateRefreshToken(rawToken string) (newRaw string, profileID uuid.UUID, err error)
func (s *AuthService) RevokeRefreshToken(rawToken string) error
func (s *AuthService) RevokeAllForProfile(profileID uuid.UUID) error

// OAuth
func (s *AuthService) FindOrCreateOAuthProfile(provider int, providerUID, email, name string) (*models.Profile, error)
```

---

## Security Considerations

| Concern | Mitigation |
|---------|-----------|
| Password storage | bcrypt with default cost (10). Never log or return passwords. |
| Token in localStorage | Don't. Access token in JS memory, refresh in httpOnly cookie. |
| Refresh token theft | Single-use rotation. Reuse of revoked token triggers full revocation. |
| CSRF on cookie endpoints | `SameSite=Strict` + `__Host-` prefix (requires HTTPS + no subdomain). For local dev, fall back to `SameSite=Lax` without `__Host-` prefix. |
| Timing attacks on login | `bcrypt.CompareHashAndPassword` is constant-time. Same error message for wrong email vs wrong password. |
| JWT secret rotation | Not needed for hackathon. Production: support `JWT_SECRET_PREV` for graceful rotation. |
| Rate limiting on auth | Not in MVP. Production: add per-IP rate limiting on `/auth/login` and `/auth/register`. |
| OAuth state CSRF | Random state param in short-lived httpOnly cookie, validated on callback. |
| Token in URL fragment | Google callback puts access token after `#` (fragment), not `?` (query). Fragments aren't sent to servers in HTTP requests. Frontend reads it and clears the URL. |

---

## Cookie Configuration

```go
func setRefreshCookie(c *gin.Context, token string, ttl time.Duration) {
    secure := c.Request.TLS != nil || os.Getenv("ENV") == "production"
    name := "refresh"
    if secure {
        name = "__Host-refresh"
    }
    c.SetSameSite(http.SameSiteStrictMode)
    c.SetCookie(name, token, int(ttl.Seconds()), "/api/auth", "", secure, true)
}
```

---

## Dependencies

Add to `go.mod`:

```
github.com/golang-jwt/jwt/v5    v5.2+     # JWT signing/verification
github.com/redis/go-redis/v9    v9.5+     # Redis client
golang.org/x/crypto              latest    # bcrypt (already in stdlib via go)
golang.org/x/oauth2              latest    # Google OAuth flow
```

`bcrypt` is in `golang.org/x/crypto/bcrypt`. No external bcrypt lib needed.

### Infrastructure

```bash
# Local dev — Redis via Docker or Homebrew
docker run -d --name redis -p 6379:6379 redis:7-alpine
# or
brew install redis && brew services start redis
```
