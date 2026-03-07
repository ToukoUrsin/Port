# Go-To-Market Plan — Port Launch

## Overview

Automated multi-platform outreach targeting news desert communities. All scripts are in `scripts/`.

**Content ready:** 68 articles across 15 towns (33 Finnish, 35 US)
**Accounts logged in:** 3 Facebook, 1 Reddit, 1 Twitter/X
**Sessions saved in:** `scripts/.fb_sessions/`, `scripts/.reddit_session/`, `scripts/.twitter_session/`

---

## Platforms & Capacity

| Platform | Accounts | Targets | Daily Capacity | Days to Cover |
|----------|----------|---------|----------------|---------------|
| Facebook | 3 | 39 groups | 45 posts/day | 1 day |
| Reddit | 1 | 14 subreddits | 14 (one-time) | 1 day |
| Twitter/X | 1 | 6-tweet thread + 3 tweets | 9 (one-time) | 1 day |
| HN | 1 (manual) | 1 Show HN post | 1 | 1 day |

## Target Groups

### Finland (7 groups)

| Key | Town | Group | Articles | Paper Death |
|-----|------|-------|----------|-------------|
| karkkila | Karkkila | Karkkilan Puskaradio | 10 | Tienoo closed 2022 |
| turku | Turku | Puskaradio Turku | 9 | Turkulainen closed 2020 |
| kemi | Kemi | Puskaradio Meri-Lappi | 7 | No local journalists |
| loviisa | Loviisa | Loviisan Puskaradio | 7 | Sanomat cut to 1x/week 2024 |
| kauhajoki | Kauhajoki | Kauhajoen Puskaradio | 0 | Coverage reduced |
| salla | Salla | Sallan Puskaradio | 0 | Zero journalists |
| enontekio | Enontekio | Enontekio | 0 | No paper at all |

### US (32 groups across 18 states)

**With articles (post these first — higher conversion):**

| Key | Town | State | Articles | Paper Death |
|-----|------|-------|----------|-------------|
| chesterton | Chesterton | Indiana | 6 | Tribune closed 2025 (141 yrs) |
| chesterton_2 | Chesterton / NWI | Indiana | 6 | Tribune closed 2025 |
| spencer | Spencer | Tennessee | 6 | 9 papers tried since 1915, all failed |
| claremont | Claremont | New Hampshire | 5 | Eagle Times suspended 2025 |
| laurel | Laurel | Mississippi | 4 | Leader-Call closed 2025 (100 yrs) |
| clayton | Jonesboro | Georgia | 3 | Clayton News gutted |
| sussex | Georgetown | Delaware | 3 | Papers consolidated |
| harlan | Harlan | Kentucky | 2 | Daily Enterprise gutted |
| mcdowell | Marion | North Carolina | 2 | McDowell News hollowed out |
| glendive | Glendive | Montana | 2 | Ranger-Review reduced |
| dawson_mt | Glendive | Montana | 2 | (2nd group for Glendive) |
| chesterfield_va | Chesterfield | Virginia | 1 | Coverage absorbed into Richmond |
| hamlin | Hamlin | West Virginia | 1 | Lincoln County papers closed |
| lincoln_wv | Hamlin | West Virginia | 1 | (2nd group for Hamlin) |

**Without articles (use "just launched" framing):**

| Key | Town | State | Paper Death |
|-----|------|-------|-------------|
| madison_fl | Madison | Florida | Enterprise-Recorder reduced |
| bardstown_ky | Bardstown | Kentucky | Kentucky Standard reduced |
| centralia_wa | Centralia | Washington | Chronicle reduced |
| elkin_nc | Elkin | North Carolina | Elkin Tribune closed 2024 |
| ely_nv | Ely | Nevada | Ely Times reduced |
| galax_va | Galax | Virginia | Galax Gazette closed 2023 |
| millinocket_me | Millinocket | Maine | Katahdin Times closed 2023 |
| orangeburg_sc | Orangeburg | South Carolina | Times and Democrat reduced |
| cairo_il | Cairo | Illinois | Citizen closed decades ago |
| paintsville_ky | Paintsville | Kentucky | Paintsville Herald closed 2024 |
| up_michigan | Upper Peninsula | Michigan | Multiple UP papers closed |
| vinton_oh | McArthur | Ohio | Vinton County Courier closed 2023 |
| wauchula_fl | Wauchula | Florida | Herald-Advocate reduced |
| owsley_ky | Booneville | Kentucky | No local paper (poorest county in KY) |
| washington_me | Machias | Maine | Valley News Observer reduced |
| perry_tn | Linden | Tennessee | Minimal coverage |
| pike_ky | Pikeville | Kentucky | Appalachian News-Express reduced |
| white_tn | Sparta | Tennessee | Sparta Expositor reduced |

### Reddit (14 subreddits)

**Broad reach:**
- r/journalism — "We built a free AI local newspaper for towns that lost theirs"
- r/localnews — "Free local news site for news deserts"
- r/technology — "2,500+ US newspapers closed. We built an AI platform..."

**State subs (targeted):**
- r/Indiana, r/newhampshire, r/mississippi, r/Tennessee, r/Kentucky, r/Georgia, r/NorthCarolina, r/Delaware, r/WestVirginia, r/Montana

**Finnish:**
- r/Suomi — "118 suomalaisessa kunnassa on 0-1 toimittajaa..."

### Twitter/X

**Main thread (6 tweets):**
1. Hook: 213 US counties have zero journalists, 2,500+ papers closed
2. Specific deaths: Chesterton Tribune (141 yrs), Laurel Leader-Call (100 yrs), Spencer TN (9 attempts)
3. What Port does: free platform, submit tips, get articles
4. Real article examples from real towns
5. Finland angle: 118 municipalities with 0-1 journalists, $5/month per town
6. CTA: "An AI article > zero coverage" + link

**Individual tweets (3):**
- Journalism angle
- Finnish angle
- Tech/builder angle

---

## Launch Day Commands

### Step 1: Twitter thread (do first — sets the narrative)

```bash
python scripts/twitter_poster.py --go
```

### Step 2: Reddit (high upside, 5-10 min delays between posts)

```bash
python scripts/reddit_poster.py --go
```

### Step 3: Facebook (3 accounts rotating, 2-5 min delays)

```bash
python scripts/multi_account_poster.py --go
```

### Step 4: Hacker News (manual — paste into hn.algolia.com/submit)

Post type: Show HN
Title: `Show HN: Free AI local newspaper for towns that lost theirs`
(Draft the body when site is live with real URLs)

### Day 2+: Resume Facebook

```bash
python scripts/multi_account_poster.py --go --resume
```

---

## Dry Run (preview all posts before launch)

```bash
# Preview Facebook posts (all 39 groups)
python scripts/multi_account_poster.py --dry-run

# Preview Reddit posts (14 subs)
python scripts/reddit_poster.py --dry-run

# Preview Twitter thread + tweets
python scripts/twitter_poster.py --dry-run
```

---

## Scaling Beyond Day 1

### Find more Facebook groups (automated)

```bash
# Searches Facebook for community groups in 30+ dead newspaper towns
python scripts/fb_group_finder.py

# Then scrape, generate articles, and post
./scripts/scale_pipeline.sh
```

`fb_group_finder.py` has 30+ towns in `DEAD_NEWSPAPERS` list including:
Youngstown OH, Muncie IN, Topeka KS, Duluth MN, Stockton CA, Missoula MT, Santa Cruz CA, Norfolk VA, Allentown PA, Anniston AL, and more.

### Full pipeline (scrape -> articles -> post)

```bash
./scripts/scale_pipeline.sh           # Full pipeline
./scripts/scale_pipeline.sh --step 2  # Start from scraping
./scripts/scale_pipeline.sh --dry-run # Dry run
```

---

## Expected Reach

### Conservative Estimate (Week 1)

| Channel | Visitors |
|---------|----------|
| Facebook (39 groups, 3 accounts) | 1,500-3,000 |
| Reddit (14 subs) | 500-5,000 |
| Twitter/X (thread + tweets) | 200-2,000 |
| Hacker News (if front page) | 500-20,000 |
| Organic shares | 200-2,000 |
| **Total** | **3,000-30,000** |

### What success looks like

- 3,000+ unique visitors in week 1
- 50+ visitors from a single Facebook group (means the post resonated)
- 3-5 people submit actual news tips (first real contributors)
- 1 organic share in a group we didn't post in (viral spread)
- Screenshot everything for pitch deck: visitor count, geographic spread, contributor submissions

---

## Conversion Strategy

### Posts WITH articles (15 towns)

Claude generates posts that **name-drop real headlines**:
> "The Tribune closed after 141 years. Found this free news site that already has stories about Feed the Region's community meals and Bloomstead Bakery. You can also send in tips."

This works because people click to read about things they already know about.

### Posts WITHOUT articles (24 towns)

Claude switches to **"just launched" framing**:
> "The Galax Gazette closed in 2023 and nobody replaced it. This free news site just launched for our area and needs locals to send in what's happening."

This works because it's a call to action — be the first contributor.

---

## Files Reference

| File | Purpose |
|------|---------|
| `scripts/fb_poster.py` | Facebook posting (single account) with all 39 targets |
| `scripts/multi_account_poster.py` | Facebook posting (3 accounts, rotation, daily limits, resume) |
| `scripts/reddit_poster.py` | Reddit posting (14 subs) |
| `scripts/twitter_poster.py` | Twitter/X thread + individual tweets |
| `scripts/fb_group_finder.py` | Find new Facebook groups for 30+ towns |
| `scripts/fb_scraper.py` | Scrape posts from Facebook groups |
| `scripts/generate_articles.py` | Turn scraped posts into articles via AI |
| `scripts/scale_pipeline.sh` | Chain: find groups -> scrape -> generate -> post |
| `scripts/.fb_sessions/` | 3 Facebook account sessions (account1, account2, account3) |
| `scripts/.reddit_session/` | Reddit session |
| `scripts/.twitter_session/` | Twitter/X session |
| `scripts/fb_output/post_log/` | Log of all posts (JSONL) |

---

## Re-blocking Social Media After Setup

Sessions are saved — you can re-block sites and the sessions still work when you unblock later.

```bash
# Reddit
sudo sed -i '/reddit/d' /etc/hosts                    # unblock
echo "0.0.0.0 reddit.com www.reddit.com" | sudo tee -a /etc/hosts  # re-block

# Twitter
sudo sed -i '/twitter/d; /x\.com/d; /twimg/d' /etc/hosts  # unblock
# re-block: restore from backup or add entries back
```

---

## Key Insight

The Facebook posts are the base layer. Reddit and HN are lottery tickets — low effort, potentially massive payoff. One organic share from a local resident is worth 10 of our posts. The goal isn't 10,000 users — it's finding the 3-5 people who become the first real contributors in each town.
