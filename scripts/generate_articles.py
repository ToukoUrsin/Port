"""
Generate news articles from scraped Facebook posts, formatted to match the DB schema.

Reads posts.json files from fb_output/, sends them to Claude API for article generation,
and outputs seed data matching the Submission model (with SubmissionMeta.Blocks, etc).

Usage:
    ANTHROPIC_API_KEY=sk-ant-... python scripts/generate_articles.py
"""

import json
import os
import sys
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path

import anthropic

OUTPUT_DIR = Path(__file__).parent / "fb_output"
ARTICLES_DIR = Path(__file__).parent / "generated_articles"

# Location seed data (matches Location model)
LOCATIONS = {
    "karkkila": {
        "id": "a1000001-0000-0000-0000-000000000001",
        "name": "Karkkila",
        "slug": "karkkila",
        "level": 3,  # LevelCity
        "lat": 60.5341,
        "lng": 24.2093,
        "parent_slug": "uusimaa",
        "region_id": "a2000001-0000-0000-0000-000000000001",
        "country_id": "a3000001-0000-0000-0000-000000000001",
        "continent_id": "a4000001-0000-0000-0000-000000000001",
        "meta": {"population": 8800, "about": "Small town in western Uusimaa, lost its local newspaper Karkkilan Tienoo in 2022."}
    },
    "kemi": {
        "id": "a1000002-0000-0000-0000-000000000001",
        "name": "Kemi",
        "slug": "kemi",
        "level": 3,
        "lat": 65.7364,
        "lng": 24.5634,
        "parent_slug": "lappi",
        "region_id": "a2000002-0000-0000-0000-000000000001",
        "country_id": "a3000001-0000-0000-0000-000000000001",
        "continent_id": "a4000001-0000-0000-0000-000000000001",
        "meta": {"population": 20800, "about": "Industrial city in Meri-Lappi, lost 102-year-old Pohjolan Sanomat in 2017."}
    },
    "loviisa": {
        "id": "a1000003-0000-0000-0000-000000000001",
        "name": "Loviisa",
        "slug": "loviisa",
        "level": 3,
        "lat": 60.4567,
        "lng": 26.2250,
        "parent_slug": "uusimaa",
        "region_id": "a2000001-0000-0000-0000-000000000001",
        "country_id": "a3000001-0000-0000-0000-000000000001",
        "continent_id": "a4000001-0000-0000-0000-000000000001",
        "meta": {"population": 15000, "about": "Bilingual coastal town, Loviisan Sanomat cut to once weekly in 2024."}
    },
    "turku": {
        "id": "a1000004-0000-0000-0000-000000000001",
        "name": "Turku",
        "slug": "turku",
        "level": 3,
        "lat": 60.4518,
        "lng": 22.2666,
        "parent_slug": "varsinais-suomi",
        "region_id": "a2000003-0000-0000-0000-000000000001",
        "country_id": "a3000001-0000-0000-0000-000000000001",
        "continent_id": "a4000001-0000-0000-0000-000000000001",
        "meta": {"population": 197000, "about": "Finland's oldest city, lost free newspaper Turkulainen in 2020."}
    },
}

# Tag bitmask values (from constants.go)
TAGS = {
    "council": 1 << 0,
    "schools": 1 << 1,
    "business": 1 << 2,
    "events": 1 << 3,
    "sports": 1 << 4,
    "community": 1 << 5,
    "culture": 1 << 6,
    "safety": 1 << 7,
    "health": 1 << 8,
    "environment": 1 << 9,
}

# Map group output dirs to location keys
GROUP_DIRS = {
    "posts.json": "karkkila",                # main fb_output/posts.json
    "239350891413816/posts.json": "kemi",
    "724474857744688/posts.json": "loviisa",
    "1415985608703080/posts.json": "turku",
}

# System owner for seeded articles
SEED_OWNER_ID = "00000000-0000-0000-0000-000000000001"


def select_best_posts(posts, max_posts=5):
    """Pick the most newsworthy posts from a group."""
    scored = []
    for p in posts:
        text = p.get("text", "").strip()
        if not text or len(text) < 30:
            continue

        score = 0
        t = text.lower()

        # Boost: has images
        if p.get("images") or p.get("local_images"):
            score += 3

        # Boost: longer text (more substance)
        score += min(len(text) // 50, 5)

        # Boost: newsworthy keywords
        news_words = ["kaupunki", "kunta", "koulu", "kirjasto", "tapahtum", "konsertti",
                       "avajaiset", "rakenn", "tie", "liikenne", "palokunta", "pelast",
                       "turvallisuus", "tervey", "sairaala", "urheilu", "joukkue", "ottelu",
                       "näyttely", "kulttuuri", "yhdistys", "avustus", "äänestyks",
                       "päätös", "budjetti", "investointi"]
        for w in news_words:
            if w in t:
                score += 2

        # Penalize: marketplace/rental listings
        sell_words = ["myydään", "vuokra", "myyn", "ostetaan", "hinta", "€/kk", "neliö"]
        for w in sell_words:
            if w in t:
                score -= 5

        # Penalize: pure ads
        if any(w in t for w in ["alennus", "tarjous", "tilaa nyt", "osta nyt"]):
            score -= 3

        scored.append((score, p))

    scored.sort(key=lambda x: -x[0])
    return [p for _, p in scored[:max_posts]]


def generate_article_prompt(post, location_name):
    """Build the Claude prompt for turning a FB post into a news article."""
    text = post.get("text", "")
    author = post.get("author", "Tuntematon")
    timestamp = post.get("timestamp", "")
    has_images = bool(post.get("images") or post.get("local_images"))

    return f"""You are a local news journalist for {location_name}, Finland. Transform this Facebook community group post into a proper local news article.

SOURCE POST:
- Author: {author}
- Posted: {timestamp}
- Text: {text}
- Has photos: {"Yes" if has_images else "No"}

RULES:
- Write in Finnish
- Only use facts from the source post — never invent details
- If the post is from a business/organization, frame it as community news, not an ad
- Local news tone: clear, direct, informative
- Include a direct quote from the original post if it contains quotable text
- If information is incomplete, note what's missing rather than inventing

OUTPUT FORMAT (respond with valid JSON only):
{{
  "headline": "Short Finnish headline (max 80 chars)",
  "summary": "1-2 sentence summary for article cards",
  "blocks": [
    {{"type": "text", "content": "Lead paragraph..."}},
    {{"type": "text", "content": "Body paragraph with context..."}},
    {{"type": "quote", "content": "Direct quote from the post", "author": "Speaker name"}},
    {{"type": "text", "content": "Closing paragraph..."}}
  ],
  "category": "council|schools|business|events|sports|community|culture|safety|health|environment",
  "tags": ["category1", "category2"]
}}"""


def post_to_article(client, post, location_key, location_name, article_index):
    """Use Claude to generate an article from a Facebook post."""
    prompt = generate_article_prompt(post, location_name)

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1500,
        messages=[{"role": "user", "content": prompt}],
    )

    # Parse the JSON response
    response_text = response.content[0].text.strip()
    # Handle markdown code blocks
    if response_text.startswith("```"):
        response_text = response_text.split("\n", 1)[1].rsplit("```", 1)[0].strip()

    article_data = json.loads(response_text)

    # Build the Submission model
    loc = LOCATIONS[location_key]
    now = datetime.now(timezone.utc)

    # Calculate tag bitmask
    tag_bits = 0
    for tag_name in article_data.get("tags", []):
        tag_name = tag_name.lower()
        if tag_name in TAGS:
            tag_bits |= TAGS[tag_name]

    # Add featured image if post has images
    featured_img = ""
    local_images = post.get("local_images", [])
    if local_images:
        featured_img = local_images[0]

    # Add image blocks for post images
    blocks = article_data.get("blocks", [])
    if local_images:
        # Insert image after first text block
        img_block = {
            "type": "image",
            "src": local_images[0],
            "caption": f"Kuva: {post.get('author', 'Facebook-ryhmä')}",
            "alt": article_data.get("headline", "")
        }
        if len(blocks) > 1:
            blocks.insert(1, img_block)
        else:
            blocks.append(img_block)

    submission = {
        "id": str(uuid.uuid4()),
        "owner_id": SEED_OWNER_ID,
        "location_id": loc["id"],
        "continent_id": loc["continent_id"],
        "country_id": loc["country_id"],
        "region_id": loc["region_id"],
        "city_id": loc["id"],
        "lat": loc["lat"],
        "lng": loc["lng"],
        "title": article_data["headline"],
        "description": article_data.get("summary", ""),
        "tags": tag_bits,
        "status": 5,  # StatusPublished
        "error": 0,
        "views": 0,
        "share_count": 0,
        "reactions": {},
        "meta": {
            "blocks": blocks,
            "review": {
                "score": 75,
                "flags": [],
                "approved": True
            },
            "summary": article_data.get("summary", ""),
            "category": article_data.get("category", "community"),
            "model": "claude-sonnet-4-20250514",
            "generated_at": now.isoformat(),
            "slug": f"{loc['slug']}-{article_index:03d}",
            "featured_img": featured_img,
            "sources": [f"Facebook: {post.get('author', 'unknown')}"],
            "published_at": now.isoformat(),
            "published_by": SEED_OWNER_ID,
        },
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
    }

    return submission


def main():
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("ERROR: Set ANTHROPIC_API_KEY environment variable")
        sys.exit(1)

    client = anthropic.Anthropic(api_key=api_key)
    ARTICLES_DIR.mkdir(parents=True, exist_ok=True)

    all_articles = []
    all_locations = list(LOCATIONS.values())

    for posts_path, location_key in GROUP_DIRS.items():
        full_path = OUTPUT_DIR / posts_path
        if not full_path.exists():
            print(f"Skipping {location_key}: {full_path} not found")
            continue

        with open(full_path) as f:
            data = json.load(f)

        location_name = LOCATIONS[location_key]["name"]
        posts = data.get("posts", [])
        best = select_best_posts(posts, max_posts=4)

        print(f"\n{'='*50}")
        print(f"{location_name}: {len(posts)} posts -> selected {len(best)} best")
        print(f"{'='*50}")

        for i, post in enumerate(best):
            text_preview = post.get("text", "")[:60].replace("\n", " ")
            print(f"\n  Generating article {i+1}/{len(best)}: {text_preview}...")

            try:
                article = post_to_article(client, post, location_key, location_name, len(all_articles) + 1)
                all_articles.append(article)
                print(f"  -> {article['title']}")
            except Exception as e:
                print(f"  ERROR: {e}")

    # Save all articles as seed data
    seed_data = {
        "locations": all_locations,
        "submissions": all_articles,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "count": len(all_articles),
    }

    output_file = ARTICLES_DIR / "seed_data.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(seed_data, f, ensure_ascii=False, indent=2, default=str)

    print(f"\n\nGenerated {len(all_articles)} articles -> {output_file}")

    # Also save a human-readable version
    readable_file = ARTICLES_DIR / "articles_readable.md"
    with open(readable_file, "w", encoding="utf-8") as f:
        for art in all_articles:
            f.write(f"# {art['title']}\n\n")
            f.write(f"*{art['description']}*\n\n")
            f.write(f"**Location:** {LOCATIONS.get(art['meta']['slug'].rsplit('-', 1)[0], {}).get('name', '?')} | ")
            f.write(f"**Category:** {art['meta']['category']}\n\n")
            for block in art["meta"]["blocks"]:
                if block["type"] == "text":
                    f.write(f"{block['content']}\n\n")
                elif block["type"] == "quote":
                    f.write(f"> \"{block['content']}\" — {block.get('author', '')}\n\n")
                elif block["type"] == "heading":
                    f.write(f"## {block['content']}\n\n")
                elif block["type"] == "image":
                    f.write(f"![{block.get('alt', '')}]({block.get('src', '')})\n")
                    f.write(f"*{block.get('caption', '')}*\n\n")
            f.write(f"---\n\n")

    print(f"Readable version -> {readable_file}")


if __name__ == "__main__":
    main()
