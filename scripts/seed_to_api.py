"""
Seed the database via the admin API.

Reads seed_data*.json files, converts blocks to markdown, seeds missing
locations + profile, then pushes articles via the existing batch endpoint.

Usage:
    ADMIN_API_TOKEN=your-token API_URL=https://news.minir.ai python scripts/seed_to_api.py
    ADMIN_API_TOKEN=your-token python scripts/seed_to_api.py                # defaults to localhost:8000
    ADMIN_API_TOKEN=your-token python scripts/seed_to_api.py seed_data.json # single file
"""

import json
import os
import sys
import time
from pathlib import Path

import requests

SCRIPTS_DIR = Path(__file__).parent
ARTICLES_DIR = SCRIPTS_DIR / "generated_articles"
SEED_FILES = ["seed_data.json", "seed_data_us.json", "seed_data_new_towns.json"]
SEED_OWNER_ID = "00000000-0000-0000-0000-000000000001"

API_URL = os.environ.get("API_URL", "http://localhost:8000")
TOKEN = os.environ.get("ADMIN_API_TOKEN", "")


def auth_headers():
    return {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}


def blocks_to_markdown(blocks, title=""):
    """Convert blocks format to markdown string."""
    parts = []
    if title:
        parts.append(f"# {title}\n")
    for block in blocks:
        btype = block.get("type", "")
        content = block.get("content", "")
        if btype == "text":
            parts.append(content)
        elif btype == "heading":
            level = block.get("level", 2)
            parts.append(f"{'#' * level} {content}")
        elif btype == "quote":
            author = block.get("author", "")
            if author:
                parts.append(f'> "{content}" — {author}')
            else:
                parts.append(f"> {content}")
        # skip image blocks — the referenced files don't exist
    return "\n\n".join(parts)


def get_location_slug_map():
    """Fetch all locations from the API and build slug -> id map."""
    resp = requests.get(f"{API_URL}/api/locations")
    if resp.status_code != 200:
        print(f"  ERROR fetching locations: {resp.status_code}")
        return {}
    locs = resp.json().get("locations", [])
    return {loc["slug"]: loc["id"] for loc in locs}


def seed_locations(locations):
    """Create missing locations via the seed endpoint."""
    url = f"{API_URL}/api/admin/seed/locations"
    resp = requests.post(url, json={"locations": locations}, headers=auth_headers())
    if resp.status_code != 200:
        print(f"  ERROR seeding locations: {resp.status_code} {resp.text[:200]}")
        return
    data = resp.json()
    print(f"  Locations: {data.get('created', 0)} created, {data.get('skipped', 0)} skipped")


def seed_profile():
    """Ensure the seed owner profile exists."""
    url = f"{API_URL}/api/admin/seed/profiles"
    resp = requests.post(url, json={"profiles": [{
        "id": SEED_OWNER_ID,
        "profile_name": "LocalNews",
        "email": "seed@localnews.app",
    }]}, headers=auth_headers())
    if resp.status_code == 200:
        print(f"  Profile: {resp.json()}")
    else:
        print(f"  ERROR seeding profile: {resp.status_code} {resp.text[:200]}")


def build_location_id_map(seed_locations_list, slug_map):
    """Map seed data location_id -> actual DB location_id using slug."""
    seed_id_to_slug = {}
    for loc in seed_locations_list:
        seed_id_to_slug[loc["id"]] = loc["slug"]

    seed_id_to_db_id = {}
    for seed_id, slug in seed_id_to_slug.items():
        if slug in slug_map:
            seed_id_to_db_id[seed_id] = slug_map[slug]
        else:
            # If the seed endpoint created it with the same ID, use that
            seed_id_to_db_id[seed_id] = seed_id
    return seed_id_to_db_id


def seed_articles(submissions, id_map, batch_size=50):
    """Convert submissions to batch format and POST via batch API."""
    articles = []
    skipped = 0
    for sub in submissions:
        meta = sub.get("meta", {})
        blocks = meta.get("blocks", [])
        title = sub.get("title", "")

        content = blocks_to_markdown(blocks, title)
        if not content.strip():
            skipped += 1
            continue

        # Map location_id from seed data to actual DB id
        loc_id = sub["location_id"]
        actual_loc_id = id_map.get(loc_id, loc_id)

        articles.append({
            "title": title,
            "content": content,
            "location_id": actual_loc_id,
            "owner_id": SEED_OWNER_ID,
            "category": meta.get("category", "community"),
            "tags": sub.get("tags", 0),
        })

    if skipped:
        print(f"  Skipped {skipped} empty articles")

    total_published = 0
    total_failed = 0

    for i in range(0, len(articles), batch_size):
        batch = articles[i:i + batch_size]
        resp = requests.post(f"{API_URL}/api/admin/batch", json={"articles": batch}, headers=auth_headers())

        if resp.status_code != 202:
            print(f"  ERROR submitting batch: {resp.status_code} {resp.text[:200]}")
            continue

        job = resp.json()
        job_id = job["job_id"]
        print(f"  Batch {job_id}: {len(batch)} articles queued")

        # Poll for completion
        for _ in range(120):
            time.sleep(5)
            sr = requests.get(f"{API_URL}/api/admin/batch/{job_id}", headers=auth_headers())
            if sr.status_code != 200:
                continue
            status = sr.json()
            if status["status"] in ("completed", "failed"):
                ok = status["processed"] - status["failed"]
                total_published += ok
                total_failed += status["failed"]
                print(f"  Batch {job_id}: {ok} published, {status['failed']} failed")
                for art in status.get("articles", []):
                    if art.get("error"):
                        print(f"    FAIL [{art['index']}] {art['title'][:50]}: {art['error']}")
                break
        else:
            print(f"  Batch {job_id}: timed out")

    return total_published, total_failed


def process_seed_file(filepath, slug_map):
    """Process a single seed data file."""
    print(f"\n{'='*60}")
    print(f"Processing: {filepath.name}")
    print(f"{'='*60}")

    with open(filepath, encoding="utf-8") as f:
        data = json.load(f)

    locations = data.get("locations", [])
    submissions = data.get("submissions", [])
    print(f"  {len(locations)} locations, {len(submissions)} articles")

    # Seed missing locations first
    if locations:
        seed_locations(locations)
        # Refresh slug map after seeding
        slug_map.update(get_location_slug_map())

    # Build ID mapping: seed data location_id -> actual DB location_id
    id_map = build_location_id_map(locations, slug_map)

    if submissions:
        published, failed = seed_articles(submissions, id_map)
        print(f"  Result: {published} published, {failed} failed")

    return len(submissions)


def main():
    if not TOKEN:
        print("ERROR: Set ADMIN_API_TOKEN environment variable")
        sys.exit(1)

    try:
        resp = requests.get(f"{API_URL}/api/health", timeout=5)
        if resp.status_code != 200:
            print(f"WARNING: API health check returned {resp.status_code}")
    except requests.ConnectionError:
        print(f"ERROR: Cannot reach API at {API_URL}")
        sys.exit(1)

    print(f"API: {API_URL}")
    print(f"Token: {'*' * 4}{TOKEN[-4:]}")

    # Seed the owner profile
    seed_profile()

    # Get current locations from DB (slug -> id map)
    slug_map = get_location_slug_map()
    print(f"  {len(slug_map)} locations already in DB")

    # Process each seed file
    files = sys.argv[1:] if len(sys.argv) > 1 else SEED_FILES
    total = 0
    for fname in files:
        filepath = ARTICLES_DIR / fname if not Path(fname).is_absolute() else Path(fname)
        if not filepath.exists():
            print(f"Skipping {fname}: not found")
            continue
        total += process_seed_file(filepath, slug_map)

    print(f"\n{'='*60}")
    print(f"Done. Processed {total} articles total.")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
