# Admin Batch Post API

Batch-publish pre-written articles without going through the generation/review pipeline. Designed for seeding content and admin automation scripts.

## Setup

Add to your `.env`:

```env
ADMIN_API_TOKEN=your-secret-token-here
BATCH_DELAY=5s        # optional, delay between articles (default 5s)
BATCH_WORKERS=1       # optional, concurrent worker goroutines (default 1)
```

The endpoint is **disabled** when `ADMIN_API_TOKEN` is empty. On startup you'll see:

```
Admin batch API enabled (1 workers, 5s delay)
```

## Endpoints

### Submit a batch

```
POST /api/admin/batch
Authorization: Bearer <ADMIN_API_TOKEN>
Content-Type: application/json
```

**Request body:**

```json
{
  "articles": [
    {
      "title": "New Park Opening in Kirkkonummi",
      "content": "# New Park Opening in Kirkkonummi\n\nThe city announced today that the new central park will open next month...",
      "location_id": "<uuid>",
      "owner_id": "<uuid>",
      "category": "community",
      "tags": 32
    }
  ]
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `title` | Yes | Fallback title (used if no `# heading` in content) |
| `content` | Yes | Full article in markdown. First `# heading` becomes the article title. |
| `location_id` | Yes | UUID of an existing location |
| `owner_id` | Yes | UUID of an existing profile (the article author) |
| `category` | No | Category string (e.g. `community`, `schools`, `politics`) |
| `tags` | No | Bitmask for tag flags (see `models.Tag*` constants) |

**Limits:** 1-100 articles per request.

**Response (202 Accepted):**

```json
{
  "job_id": "batch_a1b2c3d4",
  "total": 1,
  "status": "queued"
}
```

### Check job status

```
GET /api/admin/batch/:job_id
Authorization: Bearer <ADMIN_API_TOKEN>
```

**Response (200 OK):**

```json
{
  "id": "batch_a1b2c3d4",
  "status": "completed",
  "total": 2,
  "processed": 2,
  "failed": 0,
  "articles": [
    {
      "index": 0,
      "submission_id": "uuid-1",
      "title": "New Park Opening in Kirkkonummi",
      "status": "published"
    },
    {
      "index": 1,
      "submission_id": "uuid-2",
      "title": "School Board Meeting Summary",
      "status": "published"
    }
  ],
  "created_at": "2026-03-07T12:00:00Z",
  "completed_at": "2026-03-07T12:00:10Z"
}
```

**Job statuses:** `queued` → `processing` → `completed` | `failed`
**Article statuses:** `pending` → `published` | `failed`

Failed articles include an `error` field explaining why.

## How it works

1. `POST /api/admin/batch` validates input and enqueues a job. Returns immediately with 202.
2. A background worker picks up the job and processes articles sequentially.
3. For each article:
   - Validates that the location and owner exist in the database
   - Creates a `Submission` record with `StatusPublished`
   - Extracts the headline from the first `# heading` in the markdown
   - Extracts a summary from the first paragraph
   - Increments the location's `article_count`
   - Invalidates Redis caches for the location's article lists
   - Embeds the article for semantic search (non-fatal if it fails)
   - Sleeps `BATCH_DELAY` before the next article
4. Job status is held in memory and queryable via the status endpoint.

## Quick test

```bash
# Should return 401
curl -s -o /dev/null -w "%{http_code}" -X POST localhost:8000/api/admin/batch

# Should return 401
curl -s -o /dev/null -w "%{http_code}" -X POST localhost:8000/api/admin/batch \
  -H "Authorization: Bearer wrong-token"

# Submit a batch (replace UUIDs with real ones from your database)
curl -X POST localhost:8000/api/admin/batch \
  -H "Authorization: Bearer your-secret-token-here" \
  -H "Content-Type: application/json" \
  -d '{
    "articles": [{
      "title": "Test Article",
      "content": "# Test Article\n\nThis is a test article for batch publishing.",
      "location_id": "LOCATION_UUID_HERE",
      "owner_id": "PROFILE_UUID_HERE",
      "category": "community"
    }]
  }'

# Poll job status (use job_id from the response above)
curl localhost:8000/api/admin/batch/batch_XXXXXXXX \
  -H "Authorization: Bearer your-secret-token-here"
```

## Notes

- Articles are published immediately with no quality review or generation step.
- The `PublishedAt` timestamp is set at processing time, naturally staggered by the worker delay.
- Job status is stored in memory only — it does not survive server restarts.
- Authentication uses a static bearer token (not JWT), making it suitable for scripts and CI/CD.
