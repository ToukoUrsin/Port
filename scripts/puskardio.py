"""
Puskardio: Automated tabloid-style article generator.

Sources trending ideas from Reddit/Ylilauta, generates engaging Finnish tabloid
articles with Gemini, creates photorealistic images with Imagen, and publishes
via the admin batch API.

Usage:
    GEMINI_API_KEY=... ADMIN_API_TOKEN=... python scripts/puskardio.py
    GEMINI_API_KEY=... python scripts/puskardio.py --dry-run
    GEMINI_API_KEY=... ADMIN_API_TOKEN=... PUSKARDIO_COUNT=10 python scripts/puskardio.py
    GEMINI_API_KEY=... ADMIN_API_TOKEN=... PUSKARDIO_SOURCES=gemini python scripts/puskardio.py
"""

import json
import os
import random
import re
import sys
import tempfile
import time
import uuid
from pathlib import Path

import requests
from google import genai
from google.genai import types

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
ADMIN_API_TOKEN = os.environ.get("ADMIN_API_TOKEN", "")
API_URL = os.environ.get("API_URL", "http://localhost:8000")
PUSKARDIO_COUNT = int(os.environ.get("PUSKARDIO_COUNT", "5"))
PUSKARDIO_LOCATION_ID = os.environ.get("PUSKARDIO_LOCATION_ID", "")
PUSKARDIO_OWNER_ID = os.environ.get("PUSKARDIO_OWNER_ID", "00000000-0000-0000-0000-000000000001")
PUSKARDIO_LANGUAGE = os.environ.get("PUSKARDIO_LANGUAGE", "fi")
PUSKARDIO_SOURCES = os.environ.get("PUSKARDIO_SOURCES", "reddit,gemini").split(",")
PUSKARDIO_REDDIT_SUBS = os.environ.get("PUSKARDIO_REDDIT_SUBS", "suomi,finland").split(",")
GENERATION_MODEL = os.environ.get("GENERATION_MODEL", "gemini-3.1-flash-lite-preview")
IMAGEN_MODEL = os.environ.get("IMAGEN_MODEL", "gemini-3.1-flash-image-preview")

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

# ---------------------------------------------------------------------------
# API helpers (same pattern as seed_to_api.py)
# ---------------------------------------------------------------------------

def auth_headers():
    return {"Authorization": f"Bearer {ADMIN_API_TOKEN}", "Content-Type": "application/json"}


def auth_headers_upload():
    return {"Authorization": f"Bearer {ADMIN_API_TOKEN}"}


def get_locations():
    """Fetch all locations from the API."""
    resp = requests.get(f"{API_URL}/api/locations")
    if resp.status_code != 200:
        print(f"  ERROR fetching locations: {resp.status_code}")
        return []
    return resp.json().get("locations", [])


def pick_location(locations):
    """Pick a target location (configured or random city-level)."""
    if PUSKARDIO_LOCATION_ID:
        for loc in locations:
            if loc["id"] == PUSKARDIO_LOCATION_ID:
                return loc
        print(f"  WARNING: configured location {PUSKARDIO_LOCATION_ID} not found, picking random")

    cities = [loc for loc in locations if loc.get("level", 0) >= 3]
    if not cities:
        cities = locations
    return random.choice(cities) if cities else None


MIME_TO_EXT = {"image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp"}


def upload_image(image_bytes, submission_id, mime_type="image/png"):
    """Upload image bytes to the admin media endpoint, return URL."""
    ext = MIME_TO_EXT.get(mime_type, ".png")
    filename = f"puskardio{ext}"
    url = f"{API_URL}/api/admin/media/{submission_id}"
    with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as f:
        f.write(image_bytes)
        tmp_path = f.name

    try:
        with open(tmp_path, "rb") as f:
            resp = requests.post(
                url,
                files={"file": (filename, f, mime_type)},
                headers=auth_headers_upload(),
            )
        if resp.status_code == 200:
            return resp.json().get("url", "")
        print(f"    UPLOAD FAIL: {resp.status_code} {resp.text[:100]}")
        return ""
    finally:
        os.unlink(tmp_path)


def publish_batch(articles):
    """Submit articles via batch API and poll until done."""
    resp = requests.post(f"{API_URL}/api/admin/batch", json={"articles": articles}, headers=auth_headers())
    if resp.status_code != 202:
        print(f"  ERROR submitting batch: {resp.status_code} {resp.text[:200]}")
        return 0, len(articles)

    job = resp.json()
    job_id = job["job_id"]
    print(f"  Batch {job_id}: {len(articles)} articles queued")

    for _ in range(120):
        time.sleep(3)
        sr = requests.get(f"{API_URL}/api/admin/batch/{job_id}", headers=auth_headers())
        if sr.status_code != 200:
            continue
        status = sr.json()
        if status["status"] in ("completed", "failed"):
            ok = status["processed"] - status["failed"]
            print(f"  Batch done: {ok} published, {status['failed']} failed")
            for art in status.get("articles", []):
                if art.get("error"):
                    print(f"    FAIL [{art['index']}] {art.get('title', '?')[:50]}: {art['error']}")
            return ok, status["failed"]

    print(f"  Batch {job_id}: timed out")
    return 0, len(articles)


# ---------------------------------------------------------------------------
# Idea sourcing
# ---------------------------------------------------------------------------

def fetch_reddit_ideas(subs, limit=25):
    """Fetch trending posts from Finnish subreddits."""
    ideas = []
    headers = {"User-Agent": "puskardio/1.0 (local news generator)"}

    for sub in subs:
        try:
            resp = requests.get(
                f"https://www.reddit.com/r/{sub}/hot.json?limit={limit}",
                headers=headers,
                timeout=10,
            )
            if resp.status_code != 200:
                print(f"  Reddit r/{sub}: HTTP {resp.status_code}")
                continue

            posts = resp.json().get("data", {}).get("children", [])
            for post in posts:
                d = post.get("data", {})
                # Skip: stickied, NSFW, low score, image-only
                if d.get("stickied") or d.get("over_18") or d.get("score", 0) < 5:
                    continue
                title = d.get("title", "").strip()
                selftext = d.get("selftext", "").strip()
                if not title or len(title) < 10:
                    continue

                ideas.append({
                    "topic": title,
                    "context": selftext[:1000] if selftext else "",
                    "source": f"reddit:r/{sub}",
                    "source_url": f"https://reddit.com{d.get('permalink', '')}",
                    "language": "fi" if sub.lower() in ("suomi",) else "en",
                })

            print(f"  Reddit r/{sub}: {len([i for i in ideas if f'r/{sub}' in i['source']])} ideas")
        except Exception as e:
            print(f"  Reddit r/{sub}: ERROR {e}")

    return ideas


def fetch_gemini_ideas(client, location_name, count=10):
    """Use Gemini with Google Search to brainstorm trending local topics."""
    prompt = f"""You are a Finnish tabloid journalist brainstorming story ideas.

Find {count} interesting, funny, surprising, or heartwarming things happening in Finland right now
that would make great tabloid-style local news articles. Think Iltalehti/Iltasanomat style.

Focus on topics near {location_name} if possible, but all of Finland works.

Topics should be:
- Real and verifiable (based on actual events, trends, or phenomena)
- Fun, engaging, relatable — not boring government reports
- Mix of: community drama, feel-good stories, weird happenings, local heroes, food/culture, seasonal events, sports moments

Respond with a JSON array:
[
  {{"topic": "Short headline-style topic", "context": "2-3 sentences of background", "language": "fi"}},
  ...
]

Return ONLY the JSON array, no markdown fences."""

    try:
        response = client.models.generate_content(
            model=GENERATION_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                tools=[types.Tool(google_search=types.GoogleSearch())],
                temperature=1.0,
            ),
        )
        text = response.text.strip()
        # Strip markdown fences if present
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()

        items = json.loads(text)
        ideas = []
        for item in items:
            ideas.append({
                "topic": item.get("topic", ""),
                "context": item.get("context", ""),
                "source": "gemini",
                "source_url": "",
                "language": item.get("language", "fi"),
            })
        print(f"  Gemini brainstorm: {len(ideas)} ideas")
        return ideas
    except Exception as e:
        print(f"  Gemini brainstorm: ERROR {e}")
        return []


# ---------------------------------------------------------------------------
# Article generation
# ---------------------------------------------------------------------------

PUSKARDIO_SYSTEM_PROMPT = """You are a Finnish tabloid journalist writing for a local news platform.
Your style is Iltalehti/Iltasanomat — dramatic, engaging, warm, funny, real.

STYLE RULES:
- Headlines: punchy, dramatic, attention-grabbing. Use exclamation marks! Question marks?
- Tone: mix of humor, community warmth, mild outrage, and human interest
- Paragraphs: SHORT. 1-3 sentences max. Readers scroll fast.
- Word count: 300-500 words. Quality over quantity.
- Include at least one quote (attributed to "a local" / "paikallinen asukas" or a named person if the source mentions one)
- Make readers feel connected to the place and community
- Finnish by default unless the source is in English
- NO corporate speak, NO boring government report language
- YES to personality, emotion, storytelling, and a touch of drama
- End with something memorable — a punchline, a question, or a heartfelt note

CONTENT RULES:
- Base the article on the provided topic and context
- You may embellish and dramatize the FRAMING but don't invent false facts
- If the topic is lighthearted, be funny. If serious, be empathetic.
- Always localize — mention the town, neighborhood, or region
- Categories: council, schools, business, events, sports, community, culture, safety, health, environment

OUTPUT: Respond with valid JSON only (no markdown fences):
{
  "headline": "Dramatic Finnish headline (max 80 chars)",
  "article_markdown": "# Headline\\n\\nFull article in markdown...",
  "summary": "1-2 sentence hook for article cards",
  "category": "community",
  "tags": ["community", "culture"],
  "image_prompt": "A photorealistic photograph of [scene described vividly]. Natural lighting, taken with a DSLR camera. No text, no watermarks, no graphics."
}"""


def generate_article(client, idea, location_name):
    """Generate a puskardio article from an idea seed."""
    user_prompt = f"""LOCATION: {location_name}, Finland
TOPIC: {idea['topic']}
CONTEXT: {idea.get('context', 'No additional context.')}
SOURCE: {idea['source']}
LANGUAGE: {"Finnish" if idea.get('language', 'fi') == 'fi' else "English"}

Write a puskardio tabloid article about this topic. Make it engaging, fun, and authentic."""

    try:
        response = client.models.generate_content(
            model=GENERATION_MODEL,
            contents=user_prompt,
            config=types.GenerateContentConfig(
                system_instruction=PUSKARDIO_SYSTEM_PROMPT,
                temperature=1.0,
            ),
        )
        text = response.text.strip()
        # Strip markdown fences
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()

        return json.loads(text)
    except json.JSONDecodeError as e:
        print(f"    JSON parse error: {e}")
        print(f"    Raw response: {response.text[:200]}")
        return None
    except Exception as e:
        print(f"    Generation error: {e}")
        return None


# ---------------------------------------------------------------------------
# Image generation
# ---------------------------------------------------------------------------

def generate_image(client, image_prompt):
    """Generate a photorealistic image using Gemini multimodal. Returns (bytes, mime_type)."""
    full_prompt = (
        f"Generate a photorealistic photograph: {image_prompt} "
        "Natural lighting, taken with a smartphone or DSLR camera. "
        "No text overlays, no watermarks, no AI artifacts, no graphics. "
        "Looks like a real photo from a local newspaper."
    )

    try:
        response = client.models.generate_content(
            model=IMAGEN_MODEL,
            contents=full_prompt,
            config=types.GenerateContentConfig(
                response_modalities=["IMAGE"],
            ),
        )
        for part in response.candidates[0].content.parts:
            if part.inline_data and part.inline_data.mime_type.startswith("image/"):
                return part.inline_data.data, part.inline_data.mime_type
        print("    Image gen: no image in response")
        return None, None
    except Exception as e:
        print(f"    Image gen error: {e}")
        return None, None


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    dry_run = "--dry-run" in sys.argv

    if not GEMINI_API_KEY:
        print("ERROR: Set GEMINI_API_KEY environment variable")
        sys.exit(1)
    if not dry_run and not ADMIN_API_TOKEN:
        print("ERROR: Set ADMIN_API_TOKEN environment variable (or use --dry-run)")
        sys.exit(1)

    # Health check
    if not dry_run:
        try:
            resp = requests.get(f"{API_URL}/api/health", timeout=5)
            if resp.status_code != 200:
                print(f"WARNING: API health check returned {resp.status_code}")
        except requests.ConnectionError:
            print(f"ERROR: Cannot reach API at {API_URL}")
            sys.exit(1)

    client = genai.Client(api_key=GEMINI_API_KEY)

    print(f"Puskardio Article Generator")
    print(f"  API: {API_URL}")
    print(f"  Count: {PUSKARDIO_COUNT}")
    print(f"  Sources: {', '.join(PUSKARDIO_SOURCES)}")
    print(f"  Model: {GENERATION_MODEL}")
    print(f"  Dry run: {dry_run}")

    # Get locations
    locations = []
    location = None
    if not dry_run:
        locations = get_locations()
        location = pick_location(locations)
        if not location:
            print("ERROR: No locations found in database")
            sys.exit(1)
        print(f"  Location: {location['name']} ({location['id']})")
    else:
        location = {"name": "Kirkkonummi", "id": "00000000-0000-0000-0000-000000000000"}
        print(f"  Location: {location['name']} (dry-run)")

    # --- Phase 1: Fetch ideas ---
    print(f"\n{'='*60}")
    print("Phase 1: Fetching ideas")
    print(f"{'='*60}")

    all_ideas = []
    if "reddit" in PUSKARDIO_SOURCES:
        all_ideas.extend(fetch_reddit_ideas(PUSKARDIO_REDDIT_SUBS))
    if "gemini" in PUSKARDIO_SOURCES:
        all_ideas.extend(fetch_gemini_ideas(client, location["name"], count=PUSKARDIO_COUNT))

    if not all_ideas:
        print("ERROR: No ideas sourced. Check your sources config.")
        sys.exit(1)

    # Shuffle and pick
    random.shuffle(all_ideas)
    selected_ideas = all_ideas[:PUSKARDIO_COUNT]
    print(f"\n  Selected {len(selected_ideas)} ideas from {len(all_ideas)} total")

    # --- Phase 2: Generate articles ---
    print(f"\n{'='*60}")
    print("Phase 2: Generating articles")
    print(f"{'='*60}")

    generated = []
    for i, idea in enumerate(selected_ideas):
        print(f"\n  [{i+1}/{len(selected_ideas)}] {idea['topic'][:60]}...")

        article_data = generate_article(client, idea, location["name"])
        if not article_data:
            print("    SKIP: generation failed")
            continue

        headline = article_data.get("headline", "")
        markdown = article_data.get("article_markdown", "")
        if not headline or not markdown:
            print("    SKIP: empty headline or markdown")
            continue

        print(f"    -> {headline}")

        # Generate image
        image_url = ""
        image_prompt = article_data.get("image_prompt", "")
        if image_prompt:
            print(f"    Generating image...")
            image_bytes, mime_type = generate_image(client, image_prompt)
            if image_bytes and not dry_run:
                temp_sub_id = str(uuid.uuid4())
                image_url = upload_image(image_bytes, temp_sub_id, mime_type)
                if image_url:
                    print(f"    Image uploaded: {image_url}")
                    # Insert image into markdown after headline
                    lines = markdown.split("\n")
                    insert_idx = 1
                    for j, line in enumerate(lines):
                        if line.startswith("# "):
                            insert_idx = j + 1
                            break
                    lines.insert(insert_idx, "")
                    lines.insert(insert_idx + 1, f"![{headline}]({image_url})")
                    markdown = "\n".join(lines)
            elif image_bytes and dry_run:
                print(f"    Image generated ({len(image_bytes)} bytes {mime_type}, not uploaded in dry-run)")
            else:
                print("    Image generation failed, continuing without image")

        # Calculate tag bitmask
        tag_bits = 0
        for tag_name in article_data.get("tags", []):
            tag_name = tag_name.lower()
            if tag_name in TAGS:
                tag_bits |= TAGS[tag_name]
        if tag_bits == 0:
            tag_bits = TAGS.get(article_data.get("category", "community"), TAGS["community"])

        generated.append({
            "title": headline,
            "content": markdown,
            "location_id": location["id"],
            "owner_id": PUSKARDIO_OWNER_ID,
            "category": article_data.get("category", "community"),
            "tags": tag_bits,
            "featured_img": image_url,
            "summary": article_data.get("summary", ""),
        })

    print(f"\n  Generated {len(generated)} articles")

    if dry_run:
        print(f"\n{'='*60}")
        print("DRY RUN — Articles not published")
        print(f"{'='*60}")
        for i, art in enumerate(generated):
            print(f"\n--- Article {i+1} ---")
            print(f"Title: {art['title']}")
            print(f"Category: {art['category']}")
            print(f"Summary: {art['summary']}")
            print(f"Content preview: {art['content'][:300]}...")
        return

    if not generated:
        print("No articles generated. Exiting.")
        return

    # --- Phase 3: Publish ---
    print(f"\n{'='*60}")
    print("Phase 3: Publishing")
    print(f"{'='*60}")

    ok, failed = publish_batch(generated)

    print(f"\n{'='*60}")
    print(f"Done! {ok} published, {failed} failed out of {len(generated)} generated.")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
