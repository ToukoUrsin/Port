"""
Reddit Poster — automated outreach to news desert communities on Reddit.

Posts to state/city subreddits and journalism-related subs.
Uses Playwright to avoid API rate limits and app approval.

Usage:
    python scripts/reddit_poster.py --dry-run     # Preview all posts
    python scripts/reddit_poster.py --go           # Post to all subs
    python scripts/reddit_poster.py --sub indiana  # Post to one sub

Requires:
    pip install playwright anthropic python-dotenv
"""

import asyncio
import json
import os
import sys
import random
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

from playwright.async_api import async_playwright

PROJECT_ROOT = Path(__file__).parent.parent
load_dotenv(PROJECT_ROOT / "backend" / ".env")
load_dotenv(PROJECT_ROOT / ".env")

USER_DATA_DIR = Path(__file__).parent / ".reddit_session"
LOG_DIR = Path(__file__).parent / "fb_output" / "post_log"

# ===================================================================
# Target subreddits with post angles
# ===================================================================

TARGETS = {
    # --- High-value journalism/tech subs (broad reach) ---
    "journalism": {
        "subreddit": "r/journalism",
        "post_type": "text",
        "title": "We built a free AI local newspaper for towns that lost theirs — 68 articles across 15 towns so far",
        "angle": "journalism_meta",
        "lang": "en",
    },
    "localnews": {
        "subreddit": "r/localnews",
        "post_type": "text",
        "title": "Free local news site for news deserts — already covering 15 towns where the paper shut down",
        "angle": "local_news",
        "lang": "en",
    },
    "technews": {
        "subreddit": "r/technology",
        "post_type": "text",
        "title": "2,500+ US newspapers have closed since 2005. We built an AI platform that turns community tips into local news articles for free",
        "angle": "tech",
        "lang": "en",
    },

    # --- State/regional subs (targeted reach) ---
    "indiana": {
        "subreddit": "r/Indiana",
        "post_type": "text",
        "title": "The Chesterton Tribune closed after 141 years. We built a free replacement — already has 6 articles about Porter County",
        "angle": "state",
        "town": "Chesterton",
        "lang": "en",
    },
    "newhampshire": {
        "subreddit": "r/newhampshire",
        "post_type": "text",
        "title": "The Eagle Times suspended operations — Claremont is now a news desert. Free local news site already has 5 articles",
        "angle": "state",
        "town": "Claremont",
        "lang": "en",
    },
    "mississippi": {
        "subreddit": "r/mississippi",
        "post_type": "text",
        "title": "The Laurel Leader-Call closed after 100 years. Someone built a free local news site — already has 4 articles about Jones County",
        "angle": "state",
        "town": "Laurel",
        "lang": "en",
    },
    "tennessee": {
        "subreddit": "r/Tennessee",
        "post_type": "text",
        "title": "Van Buren County has tried 9 newspapers since 1915 — none survived. There's a new free one with 6 articles about Spencer",
        "angle": "state",
        "town": "Spencer",
        "lang": "en",
    },
    "kentucky": {
        "subreddit": "r/Kentucky",
        "post_type": "text",
        "title": "Harlan Daily Enterprise has been gutted. Free local news site launched for Harlan County",
        "angle": "state",
        "town": "Harlan",
        "lang": "en",
    },
    "georgia": {
        "subreddit": "r/Georgia",
        "post_type": "text",
        "title": "Clayton County (300K people south of Atlanta) has almost no local news coverage. Free news site launched with local articles",
        "angle": "state",
        "town": "Jonesboro",
        "lang": "en",
    },
    "northcarolina": {
        "subreddit": "r/NorthCarolina",
        "post_type": "text",
        "title": "McDowell News has been hollowed out under corporate ownership. Free local news site launched for Marion",
        "angle": "state",
        "town": "Marion",
        "lang": "en",
    },
    "delaware": {
        "subreddit": "r/Delaware",
        "post_type": "text",
        "title": "Sussex County local papers keep getting consolidated. Free news site launched — already has 3 articles about Georgetown area",
        "angle": "state",
        "town": "Georgetown",
        "lang": "en",
    },
    "westvirginia": {
        "subreddit": "r/WestVirginia",
        "post_type": "text",
        "title": "Lincoln County businesses turning to social media because the local paper vanished. Free news site launched for Hamlin",
        "angle": "state",
        "town": "Hamlin",
        "lang": "en",
    },
    "montana": {
        "subreddit": "r/Montana",
        "post_type": "text",
        "title": "Eastern Montana is one of the biggest news deserts in the country. Free local news site launched for Glendive",
        "angle": "state",
        "town": "Glendive",
        "lang": "en",
    },

    # --- Finnish subs ---
    "suomi": {
        "subreddit": "r/Suomi",
        "post_type": "text",
        "title": "118 suomalaisessa kunnassa on 0-1 toimittajaa. Rakensimme ilmaisen tekoalypohjaisen paikallislehden — 33 artikkelia 4 kunnasta",
        "angle": "suomi",
        "lang": "fi",
    },
}


def _load_pregenerated_reddit():
    """Load pre-generated Reddit post bodies from JSON file."""
    posts_file = Path(__file__).parent / "pregenerated_posts.json"
    if posts_file.exists():
        data = json.load(open(posts_file, encoding="utf-8"))
        return data.get("reddit", {})
    return {}

_PREGENERATED_REDDIT = _load_pregenerated_reddit()


async def generate_reddit_body(target: dict) -> str:
    """Return pre-generated Reddit post body, fall back to template if missing."""
    # Find the key by matching subreddit
    for key, body in _PREGENERATED_REDDIT.items():
        if key in TARGETS and TARGETS[key]["subreddit"] == target["subreddit"]:
            return body

    print(f"  No pre-generated post for {target['subreddit']}, using fallback.")
    return _fallback_body(target)


def _fallback_body(target: dict) -> str:
    """Simple fallback if Claude API unavailable."""
    if target.get("lang") == "fi":
        return (
            "118 suomalaisessa kunnassa on 0-1 toimittajaa. Rakensimme ilmaisen "
            "paikallislehden johon kuka tahansa voi lahettaa uutisvinkkeja. "
            "Sivustolla on jo 33 artikkelia neljasta kunnasta.\n\n"
            "https://news.minir.ai"
        )
    return (
        "2,500+ US newspapers have closed since 2005. We built a free platform "
        "where anyone can submit local news tips and they get turned into articles. "
        f"Already covering 15 towns.\n\n"
        "https://news.minir.ai"
    )


async def wait_for_login(page):
    """Wait for Reddit login."""
    try:
        await page.goto("https://www.reddit.com", wait_until="domcontentloaded", timeout=30000)
    except Exception:
        # Reddit sometimes blocks headless-looking browsers, try old reddit
        try:
            await page.goto("https://old.reddit.com", wait_until="domcontentloaded", timeout=30000)
        except Exception:
            print("Could not reach Reddit. Check your network connection.")
            return
    await asyncio.sleep(3)

    # Check for logged-in indicators (works on both old and new Reddit)
    logged_in = await page.query_selector(
        'button:has-text("Create Post"), '
        '[data-testid="create-post"], '
        'a[href*="/submit"], '
        '#header-bottom-right .user a, '
        'span.user-name'
    )

    if logged_in:
        print("Already logged into Reddit.")
        return

    print("\nNOT LOGGED IN — log into Reddit in the browser window.\n")

    for attempt in range(300):
        await asyncio.sleep(1)
        try:
            logged_in = await page.query_selector(
                'button:has-text("Create Post"), '
                '[data-testid="create-post"], '
                'a[href*="/submit"], '
                '#header-bottom-right .user a, '
                'span.user-name'
            )
            if logged_in:
                break
        except:
            pass
        if attempt % 30 == 29:
            print(f"  Still waiting... ({attempt + 1}s)")

    await asyncio.sleep(2)
    print("Login detected!\n")


async def post_to_reddit(page, target: dict, body: str, dry_run: bool = False) -> bool:
    """Submit a post to a subreddit."""
    sub = target["subreddit"]
    title = target["title"]

    print(f"\n{'='*60}")
    print(f"Target: {sub}")
    print(f"Title:  {title}")
    print(f"{'='*60}")
    print(f"\n{body}\n")

    if dry_run:
        print("[DRY RUN] Skipping.")
        return True

    # Navigate to submit page
    submit_url = f"https://www.reddit.com/{sub}/submit"
    await page.goto(submit_url, wait_until="domcontentloaded")
    await asyncio.sleep(3)

    # Select "Text" post type if needed
    try:
        text_tab = await page.query_selector('[role="tab"]:has-text("Text")')
        if text_tab:
            await text_tab.click()
            await asyncio.sleep(1)
    except:
        pass

    # Fill in title
    title_input = await page.query_selector(
        'textarea[placeholder*="Title"], '
        'input[placeholder*="Title"], '
        '[data-testid="post-title"] textarea'
    )
    if title_input:
        await title_input.fill(title)
        await asyncio.sleep(0.5)
    else:
        print(f"[ERROR] Could not find title input for {sub}")
        return False

    # Fill in body
    body_input = await page.query_selector(
        'div[contenteditable="true"], '
        'textarea[placeholder*="Text"], '
        '.DraftEditor-root, '
        '[data-testid="post-content"] div[contenteditable]'
    )
    if body_input:
        await body_input.click()
        await asyncio.sleep(0.3)
        # Use fill for textarea, type for contenteditable
        tag = await body_input.evaluate("el => el.tagName")
        if tag.lower() == "textarea":
            await body_input.fill(body)
        else:
            await body_input.type(body, delay=20)
        await asyncio.sleep(1)
    else:
        print(f"[ERROR] Could not find body input for {sub}")
        return False

    # Click Post
    post_btn = await page.query_selector(
        'button:has-text("Post"), '
        'button[type="submit"]:has-text("Post")'
    )
    if post_btn:
        await post_btn.click()
        await asyncio.sleep(3)
        print(f"[OK] Posted to {sub}")
        return True
    else:
        print(f"[ERROR] Could not find Post button for {sub}")
        return False


async def main():
    args = sys.argv[1:]
    dry_run = "--dry-run" in args
    go = "--go" in args
    specific_sub = None

    i = 0
    while i < len(args):
        if args[i] == "--sub" and i + 1 < len(args):
            specific_sub = args[i + 1]
            i += 2
        else:
            i += 1

    targets = TARGETS
    if specific_sub:
        if specific_sub in targets:
            targets = {specific_sub: targets[specific_sub]}
        else:
            print(f"Unknown sub: {specific_sub}")
            print(f"Available: {', '.join(targets.keys())}")
            return

    # Setup mode — just log in and save session
    if "--setup" in args:
        USER_DATA_DIR.mkdir(parents=True, exist_ok=True)
        print("Opening browser for Reddit login...")
        print("Log in, and the script will detect it automatically.\n")
        async with async_playwright() as p:
            browser = await p.chromium.launch_persistent_context(
                str(USER_DATA_DIR),
                headless=False,
                viewport={"width": 1280, "height": 900},
                args=[
                    "--disable-blink-features=AutomationControlled",
                ],
                ignore_default_args=["--enable-automation"],
            )
            # Hide webdriver flag
            page = browser.pages[0] if browser.pages else await browser.new_page()
            await page.add_init_script("""
                Object.defineProperty(navigator, 'webdriver', { get: () => false });
            """)
            await wait_for_login(page)
            await browser.close()
        print("Reddit session saved!")
        return

    if not go and not dry_run:
        print("Reddit Poster — Port News Desert Outreach")
        print(f"\nTargets: {len(targets)} subreddits")
        for k, v in targets.items():
            print(f"  {v['subreddit']:25s} {v['title'][:60]}")
        print(f"\nUsage:")
        print(f"  --dry-run     Preview posts")
        print(f"  --go          Post to all subs")
        print(f"  --sub <name>  Post to one sub")
        return

    # Generate all post bodies
    print(f"Generating {len(targets)} Reddit posts...\n")
    posts = {}
    for key, target in targets.items():
        print(f"  {target['subreddit']}...", end=" ", flush=True)
        posts[key] = await generate_reddit_body(target)
        print("done")

    if dry_run:
        print(f"\n{'='*60}")
        print(f"DRY RUN — {len(posts)} posts:")
        print(f"{'='*60}")
        for key, body in posts.items():
            target = targets[key]
            print(f"\n--- {target['subreddit']} ---")
            print(f"Title: {target['title']}")
            print(f"Body:\n{body}\n")
        return

    USER_DATA_DIR.mkdir(parents=True, exist_ok=True)

    async with async_playwright() as p:
        browser = await p.chromium.launch_persistent_context(
            str(USER_DATA_DIR),
            headless=False,
            viewport={"width": 1280, "height": 900},
            args=["--disable-blink-features=AutomationControlled"],
            ignore_default_args=["--enable-automation"],
        )
        page = browser.pages[0] if browser.pages else await browser.new_page()
        await page.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
        """)
        await wait_for_login(page)

        for key, target in targets.items():
            body = posts[key]
            await post_to_reddit(page, target, body, dry_run)

            # Delay between posts (Reddit is stricter than FB)
            await asyncio.sleep(random.randint(300, 600))

        await browser.close()

    print("\nDone!")


if __name__ == "__main__":
    asyncio.run(main())
