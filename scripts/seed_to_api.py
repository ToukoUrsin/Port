"""
Seed the database via the admin API.

Reads seed_data*.json files, converts blocks to markdown, and pushes
locations + profiles + articles to the backend batch API.

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


def headers():
    return {
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": "application/json",
    }


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
        elif btype == "image":
            # Skip broken image references (files don't exist)
            pass

    return "\n\n".join(parts)


def seed_locations(locations):
    """POST locations to the seed endpoint."""
    url = f"{API_URL}/api/admin/seed/locations"
    resp = requests.post(url, json={"locations": locations}, headers=headers())
    if resp.status_code != 200:
        print(f"  ERROR seeding locations: {resp.status_code} {resp.text[:200]}")
        return False
    data = resp.json()
    print(f"  Locations: {data.get('created', 0)} created, {data.get('skipped', 0)} skipped")
    return True


def seed_profile():
    """Ensure the seed profile exists."""
    url = f"{API_URL}/api/admin/seed/profiles"
    resp = requests.post(url, json={"profiles": [{
        "id": SEED_OWNER_ID,
        "profile_name": "LocalNews",
        "email": "seed@localnews.app",
    }]}, headers=headers())
    if resp.status_code != 200:
        print(f"  ERROR seeding profile: {resp.status_code} {resp.text[:200]}")
        return False
    print(f"  Profile: {resp.json()}")
    return True


def seed_articles(submissions, batch_size=50):
    """Convert submissions to batch format and POST via batch API."""
    articles = []
    for sub in submissions:
        meta = sub.get("meta", {})
        blocks = meta.get("blocks", [])
        title = sub.get("title", "")

        # Convert blocks to markdown
        content = blocks_to_markdown(blocks, title)
        if not content.strip():
            continue

        # Map category string to match expected values
        category = meta.get("category", "community")

        articles.append({
            "title": title,
            "content": content,
            "location_id": sub["location_id"],
            "owner_id": sub.get("owner_id", SEED_OWNER_ID),
            "category": category,
            "tags": sub.get("tags", 0),
        })

    # Send in batches of batch_size (API max is 100)
    total_published = 0
    total_failed = 0

    for i in range(0, len(articles), batch_size):
        batch = articles[i:i + batch_size]
        url = f"{API_URL}/api/admin/batch"
        resp = requests.post(url, json={"articles": batch}, headers=headers())

        if resp.status_code != 202:
            print(f"  ERROR submitting batch: {resp.status_code} {resp.text[:200]}")
            continue

        job = resp.json()
        job_id = job["job_id"]
        print(f"  Batch {job_id}: {len(batch)} articles queued")

        # Poll for completion
        status_url = f"{API_URL}/api/admin/batch/{job_id}"
        for _ in range(120):  # up to 10 minutes
            time.sleep(5)
            status_resp = requests.get(status_url, headers=headers())
            if status_resp.status_code != 200:
                continue
            status = status_resp.json()
            if status["status"] in ("completed", "failed"):
                published = status["processed"] - status["failed"]
                total_published += published
                total_failed += status["failed"]
                print(f"  Batch {job_id}: {published} published, {status['failed']} failed")
                if status["failed"] > 0:
                    for art in status.get("articles", []):
                        if art.get("error"):
                            print(f"    FAIL [{art['index']}] {art['title'][:50]}: {art['error']}")
                break
        else:
            print(f"  Batch {job_id}: timed out waiting for completion")

    return total_published, total_failed


def process_seed_file(filepath):
    """Process a single seed data file."""
    print(f"\n{'='*60}")
    print(f"Processing: {filepath.name}")
    print(f"{'='*60}")

    with open(filepath, encoding="utf-8") as f:
        data = json.load(f)

    locations = data.get("locations", [])
    submissions = data.get("submissions", [])

    print(f"  {len(locations)} locations, {len(submissions)} articles")

    # Seed locations (order matters — parents first)
    if locations:
        seed_locations(locations)

    # Seed articles
    if submissions:
        published, failed = seed_articles(submissions)
        print(f"  Result: {published} published, {failed} failed")

    return len(submissions)


def main():
    if not TOKEN:
        print("ERROR: Set ADMIN_API_TOKEN environment variable")
        sys.exit(1)

    # Check API is reachable
    try:
        resp = requests.get(f"{API_URL}/api/health", timeout=5)
        if resp.status_code != 200:
            print(f"WARNING: API health check returned {resp.status_code}")
    except requests.ConnectionError:
        print(f"ERROR: Cannot reach API at {API_URL}")
        sys.exit(1)

    print(f"API: {API_URL}")
    print(f"Token: {'*' * 4}{TOKEN[-4:]}")

    # Ensure seed profile exists
    seed_profile()

    # Process seed files
    files = sys.argv[1:] if len(sys.argv) > 1 else SEED_FILES
    total = 0
    for fname in files:
        filepath = ARTICLES_DIR / fname if not Path(fname).is_absolute() else Path(fname)
        if not filepath.exists():
            print(f"Skipping {fname}: not found")
            continue
        total += process_seed_file(filepath)

    print(f"\n{'='*60}")
    print(f"Done. Processed {total} articles total.")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
