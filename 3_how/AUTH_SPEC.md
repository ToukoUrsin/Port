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

## Resource-Level Access Control

Identity (`Auth`) and role/permission middleware answer "who are you?" and "what can you do in general?". Resource-level access control answers "can you do this to **this specific resource**?". This is enforced in handlers, not middleware, because it requires loading the resource from the database.

### Design

```
Request → Auth() → RequireRole/RequirePerm → Handler → loadResource() → checkAccess() → proceed or 403
                                                 ↑
                                          resource-level check
```

Resource checks run inside the handler after the resource is loaded from DB. This avoids double-fetching — the same loaded resource is used for both the access check and the business logic.

### Access Control Service (`services/access.go`)

Central place for all ownership and visibility checks. Every handler calls into this service rather than implementing its own check logic.

```go
// internal/services/access.go

package services

import (
    "context"

    "github.com/google/uuid"
    "github.com/localnews/backend/internal/models"
    "gorm.io/gorm"
)

type AccessService struct {
    db *gorm.DB
}

func NewAccessService(db *gorm.DB) *AccessService {
    return &AccessService{db: db}
}

// Actor represents the authenticated user making the request.
// Populated from gin.Context values set by Auth() middleware.
type Actor struct {
    ProfileID uuid.UUID
    Role      int
    Perm      int64
}

func ActorFromContext(c *gin.Context) Actor {
    id, _ := c.Get("profile_id")
    role, _ := c.Get("role")
    perm, _ := c.Get("perm")
    pid, _ := uuid.Parse(id.(string))
    return Actor{
        ProfileID: pid,
        Role:      role.(int),
        Perm:      perm.(int64),
    }
}

// IsAdmin returns true if the actor has admin role.
func (a Actor) IsAdmin() bool { return a.Role >= 2 }

// IsEditor returns true if the actor has editor role or above.
func (a Actor) IsEditor() bool { return a.Role >= 1 }

// HasPerm checks a specific permission bit.
func (a Actor) HasPerm(flag int64) bool { return a.Perm&flag != 0 }
```

### Submission Access

Submissions have an `owner_id` and an optional `submission_contributors` join table for multi-contributor submissions.

```go
// CanViewSubmission determines if the actor can read a submission.
// Published submissions are public. Drafts/in-progress are restricted.
func (s *AccessService) CanViewSubmission(actor Actor, sub *models.Submission) bool {
    // Published submissions are visible to everyone
    if sub.Status == models.StatusPublished {
        return true
    }
    // Owner always has access
    if sub.OwnerID == actor.ProfileID {
        return true
    }
    // Editors and admins can view any submission
    if actor.IsEditor() {
        return true
    }
    // Check if actor is a listed contributor
    return s.isSubmissionContributor(sub.ID, actor.ProfileID)
}

// CanEditSubmission determines if the actor can modify a submission
// (update notes, retrigger pipeline, edit generated article before publish).
func (s *AccessService) CanEditSubmission(actor Actor, sub *models.Submission) bool {
    // Owner can edit their own submissions (unless already published)
    if sub.OwnerID == actor.ProfileID && sub.Status != models.StatusPublished {
        return true
    }
    // Editors can edit any non-published submission
    if actor.IsEditor() && sub.Status != models.StatusPublished {
        return true
    }
    // Admins can edit anything
    if actor.IsAdmin() {
        return true
    }
    return false
}

// CanDeleteSubmission determines if the actor can delete a submission.
func (s *AccessService) CanDeleteSubmission(actor Actor, sub *models.Submission) bool {
    // Owner can delete their own drafts
    if sub.OwnerID == actor.ProfileID && sub.Status != models.StatusPublished {
        return true
    }
    // Only admins can delete published submissions
    if actor.IsAdmin() {
        return true
    }
    return false
}

// CanStreamSubmission determines if the actor can open the SSE pipeline stream.
// Same as view access — you need to be the owner, a contributor, or an editor.
func (s *AccessService) CanStreamSubmission(actor Actor, sub *models.Submission) bool {
    return s.CanViewSubmission(actor, sub)
}

// isSubmissionContributor checks the join table.
func (s *AccessService) isSubmissionContributor(submissionID, profileID uuid.UUID) bool {
    var count int64
    s.db.Model(&models.SubmissionContributor{}).
        Where("submission_id = ? AND profile_id = ?", submissionID, profileID).
        Count(&count)
    return count > 0
}
```

### Article Publishing Access

Publishing transitions a submission to published status. This is a privileged action.

```go
// CanPublishSubmission determines if the actor can publish a submission as an article.
func (s *AccessService) CanPublishSubmission(actor Actor, sub *models.Submission) bool {
    // Must have the Publish permission
    if !actor.HasPerm(PermPublish) {
        return false
    }
    // Submission must be in reviewed state (pipeline complete)
    if sub.Status != models.StatusReviewed {
        return false
    }
    // Editors and admins can publish any reviewed submission
    if actor.IsEditor() {
        return true
    }
    // Contributors with PermPublish can only publish their own
    return sub.OwnerID == actor.ProfileID
}
```

### Profile Access

Profiles have public/private visibility and self-edit restrictions.

```go
// CanViewProfile determines if the actor can view a profile's full details.
func (s *AccessService) CanViewProfile(actor Actor, profile *models.Profile) bool {
    // Public profiles are visible to everyone
    if profile.Public {
        return true
    }
    // Users can always view their own profile
    if profile.ID == actor.ProfileID {
        return true
    }
    // Admins and editors can view any profile
    if actor.IsEditor() {
        return true
    }
    return false
}

// CanEditProfile determines if the actor can modify a profile.
func (s *AccessService) CanEditProfile(actor Actor, profile *models.Profile) bool {
    // Users can edit their own profile
    if profile.ID == actor.ProfileID {
        return true
    }
    // Only admins can edit other profiles (requires ManageUsers perm)
    if actor.IsAdmin() && actor.HasPerm(PermManageUsers) {
        return true
    }
    return false
}

// CanChangeRole determines if the actor can change another user's role.
func (s *AccessService) CanChangeRole(actor Actor, targetProfile *models.Profile, newRole int) bool {
    // Cannot change your own role
    if targetProfile.ID == actor.ProfileID {
        return false
    }
    // Must be admin with ManageUsers
    if !actor.IsAdmin() || !actor.HasPerm(PermManageUsers) {
        return false
    }
    // Cannot promote someone to a role >= your own
    if newRole >= actor.Role {
        return false
    }
    // Cannot demote someone at or above your role level
    if targetProfile.Role >= actor.Role {
        return false
    }
    return true
}
```

### Reply Access

Replies are tied to submissions and owned by the posting profile.

```go
// CanCreateReply determines if the actor can reply to a submission.
func (s *AccessService) CanCreateReply(actor Actor, sub *models.Submission) bool {
    // Can only reply to published submissions
    if sub.Status != models.StatusPublished {
        return false
    }
    // Any authenticated user can reply
    return true
}

// CanEditReply determines if the actor can edit a reply.
func (s *AccessService) CanEditReply(actor Actor, reply *models.Reply) bool {
    // Authors can edit their own replies
    if reply.ProfileID == actor.ProfileID {
        return true
    }
    // Admins can edit any reply
    if actor.IsAdmin() {
        return true
    }
    return false
}

// CanDeleteReply determines if the actor can delete a reply.
func (s *AccessService) CanDeleteReply(actor Actor, reply *models.Reply) bool {
    // Authors can delete their own replies
    if reply.ProfileID == actor.ProfileID {
        return true
    }
    // Moderators can delete any reply
    if actor.HasPerm(PermModerate) {
        return true
    }
    return false
}

// CanModerateReply determines if the actor can change reply status (hide, flag).
func (s *AccessService) CanModerateReply(actor Actor) bool {
    return actor.HasPerm(PermModerate)
}
```

### Follow Access

Follows are user-initiated actions on locations or profiles.

```go
// CanFollow determines if the actor can follow/unfollow a target.
func (s *AccessService) CanFollow(actor Actor) bool {
    // Any authenticated user can follow
    return true
}

// CanDeleteFollow determines if the actor can remove a follow.
func (s *AccessService) CanDeleteFollow(actor Actor, follow *models.Follow) bool {
    // Users can only unfollow their own follows
    if follow.ProfileID == actor.ProfileID {
        return true
    }
    // Admins can remove any follow (e.g., cleaning up bot accounts)
    if actor.IsAdmin() {
        return true
    }
    return false
}
```

### File Access

Files belong to submissions. Access inherits from the parent submission.

```go
// CanViewFile determines if the actor can access/download a file.
func (s *AccessService) CanViewFile(actor Actor, file *models.File, sub *models.Submission) bool {
    // File visibility follows submission visibility
    return s.CanViewSubmission(actor, sub)
}

// CanDeleteFile determines if the actor can remove a file from a submission.
func (s *AccessService) CanDeleteFile(actor Actor, file *models.File, sub *models.Submission) bool {
    // The file uploader can delete their own files (if submission isn't published)
    if file.ContributorID == actor.ProfileID && sub.Status != models.StatusPublished {
        return true
    }
    // Submission owner can delete any file on their submission
    if sub.OwnerID == actor.ProfileID && sub.Status != models.StatusPublished {
        return true
    }
    // Admins can delete any file
    if actor.IsAdmin() {
        return true
    }
    return false
}
```

### Location Access

Locations are managed resources — only privileged users can create or modify them.

```go
// CanCreateLocation determines if the actor can create a new location.
func (s *AccessService) CanCreateLocation(actor Actor) bool {
    return actor.HasPerm(PermManageLocations)
}

// CanEditLocation determines if the actor can modify a location.
func (s *AccessService) CanEditLocation(actor Actor) bool {
    return actor.HasPerm(PermManageLocations)
}
```

### Handler Integration Pattern

Every handler that operates on a specific resource follows this pattern:

```go
// handlers/submissions.go

func (h *Handler) GetSubmission(c *gin.Context) {
    // 1. Parse resource ID from URL
    id, err := uuid.Parse(c.Param("id"))
    if err != nil {
        c.JSON(400, gin.H{"error": "invalid id"})
        return
    }

    // 2. Load resource from DB
    var sub models.Submission
    if err := h.db.First(&sub, "id = ?", id).Error; err != nil {
        c.JSON(404, gin.H{"error": "not found"})
        return
    }

    // 3. Build actor from auth context
    actor := services.ActorFromContext(c)

    // 4. Check resource-level access
    if !h.access.CanViewSubmission(actor, &sub) {
        c.JSON(403, gin.H{"error": "access denied"})
        return
    }

    // 5. Proceed with business logic
    c.JSON(200, sub)
}

func (h *Handler) DeleteSubmission(c *gin.Context) {
    id, err := uuid.Parse(c.Param("id"))
    if err != nil {
        c.JSON(400, gin.H{"error": "invalid id"})
        return
    }

    var sub models.Submission
    if err := h.db.First(&sub, "id = ?", id).Error; err != nil {
        c.JSON(404, gin.H{"error": "not found"})
        return
    }

    actor := services.ActorFromContext(c)

    if !h.access.CanDeleteSubmission(actor, &sub) {
        c.JSON(403, gin.H{"error": "access denied"})
        return
    }

    h.db.Delete(&sub)
    c.Status(204)
}

func (h *Handler) StreamPipeline(c *gin.Context) {
    id, err := uuid.Parse(c.Param("id"))
    if err != nil {
        c.JSON(400, gin.H{"error": "invalid id"})
        return
    }

    var sub models.Submission
    if err := h.db.First(&sub, "id = ?", id).Error; err != nil {
        c.JSON(404, gin.H{"error": "not found"})
        return
    }

    actor := services.ActorFromContext(c)

    if !h.access.CanStreamSubmission(actor, &sub) {
        c.JSON(403, gin.H{"error": "access denied"})
        return
    }

    // ... proceed with SSE pipeline
}
```

### Handler for Profile Endpoints

```go
func (h *Handler) UpdateProfile(c *gin.Context) {
    id, err := uuid.Parse(c.Param("id"))
    if err != nil {
        c.JSON(400, gin.H{"error": "invalid id"})
        return
    }

    var profile models.Profile
    if err := h.db.First(&profile, "id = ?", id).Error; err != nil {
        c.JSON(404, gin.H{"error": "not found"})
        return
    }

    actor := services.ActorFromContext(c)

    if !h.access.CanEditProfile(actor, &profile) {
        c.JSON(403, gin.H{"error": "access denied"})
        return
    }

    // ... apply updates
}

func (h *Handler) ChangeUserRole(c *gin.Context) {
    id, err := uuid.Parse(c.Param("id"))
    if err != nil {
        c.JSON(400, gin.H{"error": "invalid id"})
        return
    }

    var req struct {
        Role int `json:"role" binding:"required"`
    }
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(400, gin.H{"error": "invalid request"})
        return
    }

    var target models.Profile
    if err := h.db.First(&target, "id = ?", id).Error; err != nil {
        c.JSON(404, gin.H{"error": "not found"})
        return
    }

    actor := services.ActorFromContext(c)

    if !h.access.CanChangeRole(actor, &target, req.Role) {
        c.JSON(403, gin.H{"error": "access denied"})
        return
    }

    h.db.Model(&target).Update("role", req.Role)

    // Invalidate cached profile so new role takes effect immediately
    h.cache.DelProfile(c.Request.Context(), target.ID.String())

    c.JSON(200, gin.H{"role": req.Role})
}
```

### Handler for Reply Endpoints

```go
func (h *Handler) CreateReply(c *gin.Context) {
    subID, err := uuid.Parse(c.Param("submission_id"))
    if err != nil {
        c.JSON(400, gin.H{"error": "invalid id"})
        return
    }

    var sub models.Submission
    if err := h.db.First(&sub, "id = ?", subID).Error; err != nil {
        c.JSON(404, gin.H{"error": "submission not found"})
        return
    }

    actor := services.ActorFromContext(c)

    if !h.access.CanCreateReply(actor, &sub) {
        c.JSON(403, gin.H{"error": "replies not allowed"})
        return
    }

    // ... create reply with actor.ProfileID as author
}

func (h *Handler) DeleteReply(c *gin.Context) {
    id, err := uuid.Parse(c.Param("id"))
    if err != nil {
        c.JSON(400, gin.H{"error": "invalid id"})
        return
    }

    var reply models.Reply
    if err := h.db.First(&reply, "id = ?", id).Error; err != nil {
        c.JSON(404, gin.H{"error": "not found"})
        return
    }

    actor := services.ActorFromContext(c)

    if !h.access.CanDeleteReply(actor, &reply) {
        c.JSON(403, gin.H{"error": "access denied"})
        return
    }

    h.db.Delete(&reply)
    c.Status(204)
}
```

### Submission Status Constants

Referenced by access checks:

```go
// models/submission.go

const (
    StatusPending      int = 0   // just created, files saved
    StatusTranscribing int = 1   // audio being transcribed
    StatusGenerating   int = 2   // article being generated
    StatusReviewing    int = 3   // article being reviewed
    StatusReviewed     int = 4   // pipeline complete, awaiting publish decision
    StatusPublished    int = 5   // live and publicly visible
    StatusFailed       int = 6   // pipeline error
)
```

### Access Control Matrix

Complete matrix of who can do what:

| Resource | Action | Owner | Contributor | Editor | Admin | Public |
|----------|--------|-------|-------------|--------|-------|--------|
| **Submission (draft)** | View | Y | Y | Y | Y | - |
| | Edit | Y | - | Y | Y | - |
| | Delete | Y | - | - | Y | - |
| | Stream SSE | Y | Y | Y | Y | - |
| **Submission (published)** | View | Y | Y | Y | Y | Y |
| | Edit | - | - | - | Y | - |
| | Delete | - | - | - | Y | - |
| **Publish** | Publish | Own only | - | Y | Y | - |
| **Profile (public)** | View | Y | - | Y | Y | Y |
| **Profile (private)** | View | Y (self) | - | Y | Y | - |
| | Edit | Y (self) | - | - | Y + ManageUsers | - |
| | Change role | - | - | - | Y + ManageUsers | - |
| **Reply** | Create | Y (on published) | Y (on published) | Y | Y | - |
| | Edit | Y (own) | - | - | Y | - |
| | Delete | Y (own) | - | Y + Moderate | Y | - |
| | Moderate (hide/flag) | - | - | Y + Moderate | Y | - |
| **Follow** | Create | Y | Y | Y | Y | - |
| | Delete own | Y | - | - | Y | - |
| **File** | View | Follows submission | | | | |
| | Delete | Uploader or sub owner (draft only) | - | - | Y | - |
| **Location** | Create | - | - | - | Y + ManageLocations | - |
| | Edit | - | - | - | Y + ManageLocations | - |
| **Tag** | Create | - | - | Y | Y | - |

### Security: 404 vs 403

When a user lacks access, return **404** (not 403) for resources that should be invisible to unauthorized users. This prevents information leakage — an attacker can't probe for existence of resources.

```go
// Use 404 when the resource should be invisible
if !h.access.CanViewSubmission(actor, &sub) {
    c.JSON(404, gin.H{"error": "not found"})
    return
}

// Use 403 when the resource is known to exist but action is denied
// (e.g., user can view but can't edit)
if !h.access.CanEditSubmission(actor, &sub) {
    c.JSON(403, gin.H{"error": "access denied"})
    return
}
```

Rule of thumb:
- **404** for view checks — hides existence
- **403** for action checks on resources the user can already see

### List Filtering

List endpoints (`GET /api/submissions`, `GET /api/articles`) must scope queries by access level, not just return everything and filter in Go:

```go
func (h *Handler) ListSubmissions(c *gin.Context) {
    actor := services.ActorFromContext(c)

    query := h.db.Model(&models.Submission{})

    if actor.IsEditor() {
        // Editors see all submissions
    } else {
        // Contributors see only their own + submissions they're listed on
        query = query.Where(
            "owner_id = ? OR id IN (SELECT submission_id FROM submission_contributors WHERE profile_id = ?)",
            actor.ProfileID, actor.ProfileID,
        )
    }

    // ... apply pagination, filters, etc.
    var submissions []models.Submission
    query.Order("created_at DESC").Find(&submissions)
    c.JSON(200, submissions)
}
```

### File Structure Update

```
backend/internal/
├── services/
│   ├── auth.go              # token generation, password hashing
│   └── access.go            # NEW — resource-level access control
```

---

## Route Protection Map

How middleware applies to existing + new routes:

```go
// cmd/server/main.go (router setup)

public := r.Group("/api")
{
    // Auth
    public.POST("/auth/register", h.Register)
    public.POST("/auth/login", h.Login)
    public.POST("/auth/refresh", h.Refresh)
    public.GET("/auth/google", h.GoogleRedirect)
    public.GET("/auth/google/callback", h.GoogleCallback)

    // Public reads (published content only)
    public.GET("/articles", h.ListArticles)                  // only published
    public.GET("/articles/:id", h.GetArticle)                // only published (OptionalAuth for personalization)
    public.GET("/search", h.Search)                          // only published results
    public.GET("/locations/:slug/articles", h.LocationArticles)
}

authed := r.Group("/api", middleware.Auth(jwtSecret))
{
    authed.POST("/auth/logout", h.Logout)

    // Submissions — resource checks in handler
    authed.POST("/submissions", h.CreateSubmission)          // PermSubmit checked
    authed.GET("/submissions", h.ListSubmissions)            // scoped by ownership/role
    authed.GET("/submissions/:id", h.GetSubmission)          // CanViewSubmission
    authed.PUT("/submissions/:id", h.UpdateSubmission)       // CanEditSubmission
    authed.DELETE("/submissions/:id", h.DeleteSubmission)    // CanDeleteSubmission
    authed.GET("/submissions/:id/stream", h.StreamPipeline)  // CanStreamSubmission

    // Publish — resource check: CanPublishSubmission
    authed.POST("/submissions/:id/publish", h.PublishSubmission)

    // Profiles — resource checks in handler
    authed.GET("/profiles/:id", h.GetProfile)                // CanViewProfile (404 if private + no access)
    authed.PUT("/profiles/:id", h.UpdateProfile)             // CanEditProfile
    authed.GET("/profiles/me", h.GetMyProfile)               // always own profile

    // Replies — resource checks in handler
    authed.POST("/submissions/:id/replies", h.CreateReply)   // CanCreateReply
    authed.PUT("/replies/:id", h.UpdateReply)                // CanEditReply
    authed.DELETE("/replies/:id", h.DeleteReply)             // CanDeleteReply

    // Follows
    authed.POST("/follows", h.CreateFollow)                  // any authed user
    authed.DELETE("/follows/:id", h.DeleteFollow)            // CanDeleteFollow (own only)

    // Files
    authed.DELETE("/files/:id", h.DeleteFile)                // CanDeleteFile
}

// Admin routes — role gate + resource checks in handler
admin := r.Group("/api", middleware.Auth(jwtSecret), middleware.RequireRole(2))
{
    admin.PUT("/profiles/:id/role", h.ChangeUserRole)        // CanChangeRole
    admin.POST("/locations", h.CreateLocation)               // CanCreateLocation
    admin.PUT("/locations/:id", h.UpdateLocation)            // CanEditLocation
}

// Moderation — permission gate
mod := r.Group("/api", middleware.Auth(jwtSecret), middleware.RequirePerm(PermModerate))
{
    mod.PUT("/replies/:id/moderate", h.ModerateReply)        // CanModerateReply
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
│   ├── submissions.go       # MODIFY — resource-level access checks via AccessService
│   ├── profiles.go          # MODIFY — CanViewProfile, CanEditProfile, CanChangeRole
│   ├── replies.go           # MODIFY — CanCreateReply, CanEditReply, CanDeleteReply
│   └── follows.go           # MODIFY — CanDeleteFollow (own only)
├── services/
│   ├── auth.go              # NEW — token generation, password hashing, refresh rotation
│   └── access.go            # NEW — resource-level access control (Actor, Can* functions)
└── models/
    ├── profile.go           # existing schema
    ├── submission.go         # existing — status constants used by access checks
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
| IDOR (Insecure Direct Object Reference) | Every handler that takes a resource ID checks ownership via `AccessService` before proceeding. No resource is returned based on ID alone. |
| Privilege escalation via role change | `CanChangeRole` prevents self-promotion, promoting above own level, and demoting peers/superiors. |
| Information leakage on 403 | View checks return 404 (hides existence). Action checks on visible resources return 403. |
| List endpoint data leakage | List queries are scoped by role/ownership at the DB level — not filtered in Go after a full SELECT. |

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
