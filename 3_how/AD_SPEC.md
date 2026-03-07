# Advertiser Flow — Technical Specification

**Purpose:** Local businesses pay to reach readers in their area. Ads feel native to the news feed — not intrusive banners, but sponsored cards and promoted content that match the editorial format.

---

## Ad Types

| Type | Format | Where it appears |
|------|--------|-----------------|
| **Sponsored Card** | Image + headline + short text, styled like an article card but marked "Sponsored" | Inserted into the article feed every Nth position |
| **Promoted Article** | Full submission owned by the advertiser, flagged as sponsored | Pinned to top of feed or boosted in ranking |
| **Banner** | Image with click-through URL | Above/below feed, between article sections |

Sponsored Cards are the primary format for the MVP. Promoted Articles and Banners are post-hackathon.

---

## Database Schema

```sql
CREATE TABLE campaigns (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advertiser_id   UUID REFERENCES advertisers(id) NOT NULL,
    name            VARCHAR(300) NOT NULL,
    status          SMALLINT DEFAULT 0,     -- 0=draft, 1=active, 2=paused, 3=completed, 4=rejected
    budget_cents    BIGINT NOT NULL,         -- total budget in cents
    spent_cents     BIGINT DEFAULT 0,        -- running spend
    daily_limit     INTEGER DEFAULT 0,       -- max impressions per day, 0=unlimited
    bid_cents       INTEGER DEFAULT 0,       -- cost per impression in cents
    tags            BIGINT DEFAULT 0,        -- target categories (matches submission tags bitmask)
    start_at        TIMESTAMPTZ NOT NULL,
    end_at          TIMESTAMPTZ NOT NULL,
    meta            JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_campaigns_advertiser ON campaigns (advertiser_id);
CREATE INDEX idx_campaigns_status ON campaigns (status);
CREATE INDEX idx_campaigns_dates ON campaigns (start_at, end_at);

CREATE TABLE campaign_locations (
    campaign_id     UUID REFERENCES campaigns(id) NOT NULL,
    location_id     UUID REFERENCES locations(id) NOT NULL,
    PRIMARY KEY (campaign_id, location_id)
);

CREATE INDEX idx_campaign_locations_location ON campaign_locations (location_id);

CREATE TABLE ads (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id     UUID REFERENCES campaigns(id) NOT NULL,
    ad_type         SMALLINT NOT NULL,       -- 1=sponsored_card, 2=promoted_article, 3=banner
    status          SMALLINT DEFAULT 0,      -- 0=draft, 1=active, 2=paused, 3=rejected
    meta            JSONB DEFAULT '{}',      -- creative content (type-specific)
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ads_campaign ON ads (campaign_id);
CREATE INDEX idx_ads_status ON ads (status);

CREATE TABLE ad_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ad_id           UUID REFERENCES ads(id) NOT NULL,
    campaign_id     UUID REFERENCES campaigns(id) NOT NULL,
    profile_id      UUID,                    -- NULL for anonymous readers
    location_id     UUID,                    -- where the ad was shown
    event_type      SMALLINT NOT NULL,       -- 1=impression, 2=click
    meta            JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ad_events_ad ON ad_events (ad_id);
CREATE INDEX idx_ad_events_campaign ON ad_events (campaign_id);
CREATE INDEX idx_ad_events_type ON ad_events (event_type);
CREATE INDEX idx_ad_events_date ON ad_events (created_at);
```

### Why `campaign_locations` is a join table

A campaign targets one or more locations. A bakery in Turku might target both "turku" and "turku/keskusta". The join table lets one campaign span multiple locations and lets the ad selection query filter by `location_id` with a simple join.

---

## Go Structs

```go
// internal/models/campaign.go

type CampaignMeta struct {
    Notes string `json:"notes,omitempty"` // internal notes from advertiser
}

type Campaign struct {
    ID           uuid.UUID            `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
    AdvertiserID uuid.UUID            `gorm:"type:uuid;not null;index" json:"advertiser_id"`
    Name         string               `gorm:"type:varchar(300);not null" json:"name"`
    Status       int16                `gorm:"default:0;index" json:"status"`
    BudgetCents  int64                `gorm:"not null" json:"budget_cents"`
    SpentCents   int64                `gorm:"default:0" json:"spent_cents"`
    DailyLimit   int                  `gorm:"default:0" json:"daily_limit"`
    BidCents     int                  `gorm:"default:0" json:"bid_cents"`
    Tags         int64                `gorm:"default:0" json:"tags"`
    StartAt      time.Time            `gorm:"not null" json:"start_at"`
    EndAt        time.Time            `gorm:"not null" json:"end_at"`
    Meta         JSONB[CampaignMeta]  `gorm:"type:jsonb;default:'{}'" json:"meta"`
    Timestamps
}

type CampaignLocation struct {
    CampaignID uuid.UUID `gorm:"type:uuid;primaryKey" json:"campaign_id"`
    LocationID uuid.UUID `gorm:"type:uuid;primaryKey;index:idx_campaign_locations_location" json:"location_id"`
}
```

```go
// internal/models/ad.go

type SponsoredCardContent struct {
    Headline string `json:"headline"`
    Text     string `json:"text"`
    Image    string `json:"image"`           // path to creative image
    ClickURL string `json:"click_url"`
    CTA      string `json:"cta,omitempty"`   // "Learn More", "Visit Store", etc.
}

type BannerContent struct {
    Image    string `json:"image"`
    ClickURL string `json:"click_url"`
    Alt      string `json:"alt,omitempty"`
}

type AdMeta struct {
    // Only one of these is populated, based on ad_type
    Card   *SponsoredCardContent `json:"card,omitempty"`
    Banner *BannerContent        `json:"banner,omitempty"`

    // Promoted article links to an existing submission
    SubmissionID *uuid.UUID `json:"submission_id,omitempty"`
}

type Ad struct {
    ID         uuid.UUID    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
    CampaignID uuid.UUID    `gorm:"type:uuid;not null;index" json:"campaign_id"`
    AdType     int16        `gorm:"not null" json:"ad_type"`
    Status     int16        `gorm:"default:0;index" json:"status"`
    Meta       JSONB[AdMeta] `gorm:"type:jsonb;default:'{}'" json:"meta"`
    Timestamps
}
```

```go
// internal/models/ad_event.go

type AdEventMeta struct {
    UserAgent string `json:"user_agent,omitempty"`
    Referrer  string `json:"referrer,omitempty"`
}

type AdEvent struct {
    ID         uuid.UUID          `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
    AdID       uuid.UUID          `gorm:"type:uuid;not null;index" json:"ad_id"`
    CampaignID uuid.UUID          `gorm:"type:uuid;not null;index" json:"campaign_id"`
    ProfileID  *uuid.UUID         `gorm:"type:uuid" json:"profile_id,omitempty"`
    LocationID *uuid.UUID         `gorm:"type:uuid" json:"location_id,omitempty"`
    EventType  int16              `gorm:"not null;index" json:"event_type"`
    Meta       JSONB[AdEventMeta] `gorm:"type:jsonb;default:'{}'" json:"meta"`
    CreatedAt  time.Time          `gorm:"autoCreateTime;index" json:"created_at"`
}
```

---

## Ad Selection Algorithm

When loading a feed for a location, the backend selects eligible ads:

```sql
-- Find active ads for a given location
SELECT a.id, a.meta, c.bid_cents
FROM ads a
JOIN campaigns c ON a.campaign_id = c.id
JOIN campaign_locations cl ON cl.campaign_id = c.id
WHERE cl.location_id = $1                          -- target location
  AND c.status = 1                                 -- campaign active
  AND a.status = 1                                 -- ad active
  AND c.start_at <= NOW() AND c.end_at > NOW()     -- within date range
  AND c.spent_cents < c.budget_cents               -- budget remaining
ORDER BY c.bid_cents DESC, random()                -- highest bid first, random tiebreak
LIMIT 3;                                           -- fetch a small pool
```

### Selection rules

1. **Location match** — campaign must target the location being viewed (or an ancestor via the location hierarchy)
2. **Budget check** — `spent_cents < budget_cents`
3. **Daily cap** — if `daily_limit > 0`, count today's impressions and skip if exceeded
4. **Category match** — if campaign `tags != 0`, at least one bit must overlap with the surrounding articles' tags (contextual relevance)
5. **Bid ranking** — higher bid wins, random tiebreak for equal bids
6. **Frequency cap** — same ad shown to same profile max 3 times per day (checked via Redis counter)

### Redis caching for ad selection

```
ad:eligible:{location_id}     → cached eligible ad pool (TTL 5min, shorter than content cache)
ad:freq:{profile_id}:{ad_id}  → impression count today (TTL until midnight)
ad:daily:{campaign_id}        → daily impression count (TTL until midnight)
```

Short TTL on eligible ads because budget/status changes need to propagate quickly.

---

## Feed Insertion Logic

The feed API returns articles interleaved with ads. The frontend doesn't decide placement — the backend inserts ad slots into the response.

### Insertion pattern

```
Position 0:  Article
Position 1:  Article
Position 2:  Article
Position 3:  ── Ad Slot ──
Position 4:  Article
Position 5:  Article
Position 6:  Article
Position 7:  ── Ad Slot ──
...
```

Every 4th position is an ad slot. If no eligible ad exists for a slot, it's skipped (no empty space).

### Feed response shape

```json
{
  "items": [
    { "type": "article", "data": { "id": "...", "meta": { "blocks": [...] } } },
    { "type": "article", "data": { ... } },
    { "type": "article", "data": { ... } },
    { "type": "ad", "data": { "id": "...", "ad_type": 1, "meta": { "card": { ... } }, "tracking_url": "/api/ads/{id}/click" } },
    { "type": "article", "data": { ... } },
    ...
  ],
  "next_offset": 20
}
```

The `type` field tells the frontend which component to render. Articles render as article cards. Ads render as sponsored cards with a "Sponsored" label.

### Backend implementation

```go
// handlers/feed.go

func (h *Handler) GetFeed(c *gin.Context) {
    locationID := c.Param("location_id")
    offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
    limit := 20

    // Fetch articles
    var submissions []models.Submission
    h.db.Where("location_id = ? AND status = ?", locationID, StatusPublished).
        Order("created_at DESC").
        Offset(offset).Limit(limit).
        Find(&submissions)

    // Fetch eligible ads (from cache or DB)
    ads := h.adService.GetEligible(c, locationID)

    // Interleave
    items := make([]FeedItem, 0, len(submissions)+len(ads))
    adIdx := 0
    for i, sub := range submissions {
        items = append(items, FeedItem{Type: "article", Data: sub})

        // Insert ad every 4th position
        if (i+1)%3 == 0 && adIdx < len(ads) {
            items = append(items, FeedItem{Type: "ad", Data: ads[adIdx]})
            h.adService.RecordImpression(c, ads[adIdx])
            adIdx++
        }
    }

    c.JSON(http.StatusOK, gin.H{
        "items":       items,
        "next_offset": offset + limit,
    })
}

type FeedItem struct {
    Type string `json:"type"` // "article" or "ad"
    Data any    `json:"data"`
}
```

---

## API Endpoints

### Public (reader-facing)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/locations/{slug}/feed` | Articles + interleaved ads |
| POST | `/api/ads/{id}/click` | Record click event, redirect to `click_url` |

### Advertiser (auth required, advertiser role)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/advertiser/campaigns` | Create campaign |
| GET | `/api/advertiser/campaigns` | List own campaigns |
| GET | `/api/advertiser/campaigns/{id}` | Campaign details + stats |
| PUT | `/api/advertiser/campaigns/{id}` | Update campaign (name, budget, dates, targeting) |
| PATCH | `/api/advertiser/campaigns/{id}/status` | Activate / pause / complete |
| POST | `/api/advertiser/campaigns/{id}/ads` | Create ad within campaign |
| GET | `/api/advertiser/campaigns/{id}/ads` | List ads in campaign |
| PUT | `/api/advertiser/ads/{id}` | Update ad creative |
| PATCH | `/api/advertiser/ads/{id}/status` | Activate / pause ad |
| GET | `/api/advertiser/campaigns/{id}/stats` | Impressions, clicks, CTR, spend |

### Admin (editor+ role)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/campaigns` | All campaigns (for review) |
| PATCH | `/api/admin/campaigns/{id}/status` | Approve / reject campaign |
| PATCH | `/api/admin/ads/{id}/status` | Approve / reject ad creative |

---

## Tracking & Analytics

### Impression tracking

Impressions are recorded when the backend inserts an ad into a feed response. Each impression:
1. Inserts a row into `ad_events` (event_type=1)
2. Increments `campaigns.spent_cents` by `bid_cents`
3. Increments the Redis daily counter `ad:daily:{campaign_id}`
4. Increments the Redis frequency counter `ad:freq:{profile_id}:{ad_id}`

For the MVP, impressions are recorded server-side when the feed is served. Post-hackathon, use a client-side beacon (IntersectionObserver) for viewability — only count impressions when the ad is actually visible in the viewport.

### Click tracking

`POST /api/ads/{id}/click` records the event and returns a 302 redirect to the ad's `click_url`. This gives accurate click counts without JavaScript dependencies.

```go
func (h *Handler) AdClick(c *gin.Context) {
    adID := c.Param("id")

    var ad models.Ad
    if err := h.db.First(&ad, "id = ?", adID).Error; err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
        return
    }

    // Record click event
    h.db.Create(&models.AdEvent{
        AdID:       ad.ID,
        CampaignID: ad.CampaignID,
        EventType:  2, // click
    })

    // Redirect to destination
    clickURL := ad.Meta.V.Card.ClickURL
    c.Redirect(http.StatusFound, clickURL)
}
```

### Stats query

```sql
-- Campaign stats for advertiser dashboard
SELECT
    c.id,
    c.name,
    c.budget_cents,
    c.spent_cents,
    COUNT(CASE WHEN ae.event_type = 1 THEN 1 END) AS impressions,
    COUNT(CASE WHEN ae.event_type = 2 THEN 1 END) AS clicks,
    ROUND(
        COUNT(CASE WHEN ae.event_type = 2 THEN 1 END)::NUMERIC /
        NULLIF(COUNT(CASE WHEN ae.event_type = 1 THEN 1 END), 0) * 100, 2
    ) AS ctr_percent
FROM campaigns c
LEFT JOIN ad_events ae ON ae.campaign_id = c.id
WHERE c.advertiser_id = $1
GROUP BY c.id
ORDER BY c.created_at DESC;
```

---

## Frontend Integration

### Feed rendering

The feed component receives a mixed `items[]` array. Render based on `type`:

```tsx
function Feed({ items }: { items: FeedItem[] }) {
  return (
    <div className="feed">
      {items.map((item) =>
        item.type === "article" ? (
          <ArticleCard key={item.data.id} article={item.data} />
        ) : (
          <SponsoredCard key={item.data.id} ad={item.data} />
        )
      )}
    </div>
  );
}
```

### Sponsored card component

Visually similar to `ArticleCard` but:
- "Sponsored" label in top corner
- Slightly different background (use `--color-surface-sponsored` token)
- Click wraps the entire card in an `<a href="/api/ads/{id}/click">` for tracking
- No author/date line — replaced with advertiser name

```tsx
function SponsoredCard({ ad }: { ad: AdData }) {
  const card = ad.meta.card;
  return (
    <a href={`/api/ads/${ad.id}/click`} className="sponsored-card">
      <span className="sponsored-label">Sponsored</span>
      <img src={card.image} alt={card.headline} />
      <h3>{card.headline}</h3>
      <p>{card.text}</p>
      {card.cta && <span className="cta">{card.cta}</span>}
    </a>
  );
}
```

---

## Hackathon vs Production

### Build now (MVP)

- `advertisers` + `campaigns` + `ads` + `ad_events` schemas
- Sponsored card ad type only
- Feed interleaving (every 4th position)
- Server-side impression tracking
- Click redirect tracking
- Basic advertiser CRUD endpoints
- Hardcoded test campaigns for demo

### Post-hackathon

- Promoted articles and banner ad types
- Client-side viewability tracking (IntersectionObserver beacon)
- Self-serve advertiser dashboard with real-time stats
- Campaign approval workflow for editors
- A/B creative testing within a campaign
- Location hierarchy targeting (target a parent, reach all children)
- Frequency capping tuning
- Invoice generation from `ad_events` aggregation
