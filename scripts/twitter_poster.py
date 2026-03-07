"""
Twitter/X Poster — automated outreach for news desert communities.

Posts a thread about Port to Twitter/X, plus individual tweets
tagging local journalists, media orgs, and town accounts.

Usage:
    python scripts/twitter_poster.py --setup        # Log in and save session
    python scripts/twitter_poster.py --dry-run      # Preview all tweets
    python scripts/twitter_poster.py --go           # Post everything
    python scripts/twitter_poster.py --thread       # Post just the main thread

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

USER_DATA_DIR = Path(__file__).parent / ".twitter_session"
LOG_DIR = Path(__file__).parent / "fb_output" / "post_log"

# ===================================================================
# Thread content — the main viral play
# ===================================================================

THREAD = [
    {
        "text": (
            "213 US counties have zero journalists.\n\n"
            "2,500+ newspapers have closed since 2005.\n\n"
            "We built a free AI local newspaper for towns that lost theirs.\n\n"
            "It already has 68 articles across 15 towns in 11 states. Here's what happened:"
        ),
    },
    {
        "text": (
            "The Chesterton Tribune in Indiana closed after 141 YEARS.\n\n"
            "The Laurel Leader-Call in Mississippi closed after 100 years.\n\n"
            "Van Buren County, Tennessee has tried 9 newspapers since 1915. All failed.\n\n"
            "These communities now rely on Facebook groups for all local news."
        ),
    },
    {
        "text": (
            "So we built Port — a free platform where anyone can submit a news tip "
            "(voice message, photo, or text) and it gets turned into a real article.\n\n"
            "No paywall. No subscription. Just local news for places that have none."
        ),
    },
    {
        "text": (
            "We seeded it with articles from real community conversations:\n\n"
            "- \"Feed the Region serves free meals in NW Indiana\"\n"
            "- \"Helicopter airlifts patient after emergency on SR 111\"\n"
            "- \"Eaglettes rally community for basketball showdown\"\n\n"
            "Real stories. Real towns. Nobody else was covering them."
        ),
    },
    {
        "text": (
            "It's not just the US.\n\n"
            "In Finland, 118 municipalities have 0-1 journalists.\n"
            "We have 33 articles across 4 Finnish towns where papers shut down.\n\n"
            "The economics are wild: covering a town costs ~$5/month in AI processing."
        ),
    },
    {
        "text": (
            "We're not replacing journalists. We're covering the gaps where "
            "journalists no longer exist.\n\n"
            "An AI article about a school board meeting > zero coverage of a school board meeting.\n\n"
            "Check it out (it's free): https://port.news"
        ),
    },
]

# Individual tweets for specific audiences
INDIVIDUAL_TWEETS = [
    {
        "key": "journalism",
        "text": (
            "2,500+ US newspapers closed since 2005. "
            "We built a free AI platform that turns community tips into local news articles.\n\n"
            "Already covering 15 towns across 11 states where the paper shut down.\n\n"
            "https://port.news"
        ),
    },
    {
        "key": "finnish",
        "text": (
            "118 suomalaisessa kunnassa on 0-1 toimittajaa.\n\n"
            "Rakensimme ilmaisen paikallislehden johon kuka tahansa voi lahettaa "
            "uutisvinkkeja. 33 artikkelia 4 kunnasta.\n\n"
            "Karkkilan Tienoo lakkautettiin 2022. Turkulainen lopetti 2020. "
            "Me tuodaan paikallisuutiset takaisin.\n\n"
            "https://port.news"
        ),
    },
    {
        "key": "tech",
        "text": (
            "Built a full AI news pipeline this weekend:\n\n"
            "Community tip (voice/photo/text)\n"
            "-> Claude generates article\n"
            "-> Claude reviews for accuracy\n"
            "-> Published in ~3 minutes\n"
            "-> Cost: ~$0.05 per article\n\n"
            "Free local news for towns that lost their newspaper.\n\n"
            "https://port.news"
        ),
    },
]


async def wait_for_login(page):
    """Wait for Twitter login."""
    try:
        await page.goto("https://x.com/home", wait_until="domcontentloaded", timeout=30000)
    except Exception:
        try:
            await page.goto("https://twitter.com/home", wait_until="domcontentloaded", timeout=30000)
        except Exception:
            print("Could not reach Twitter/X. Check your network.")
            return False
    await asyncio.sleep(3)

    logged_in = await page.query_selector(
        '[data-testid="SideNav_NewTweet_Button"], '
        '[aria-label="Post"], '
        '[data-testid="tweetButtonInline"], '
        'a[href="/compose/post"]'
    )

    if logged_in:
        print("Already logged into Twitter/X.")
        return True

    print("\nNOT LOGGED IN — log into Twitter/X in the browser window.\n")

    for attempt in range(300):
        await asyncio.sleep(1)
        try:
            logged_in = await page.query_selector(
                '[data-testid="SideNav_NewTweet_Button"], '
                '[aria-label="Post"], '
                '[data-testid="tweetButtonInline"], '
                'a[href="/compose/post"]'
            )
            if logged_in:
                print("Login detected!")
                return True
        except:
            pass
        if attempt % 30 == 29:
            print(f"  Still waiting... ({attempt + 1}s)")

    await asyncio.sleep(2)
    return True


async def post_tweet(page, text: str, reply_to_last: bool = False, dry_run: bool = False) -> bool:
    """Post a tweet or reply to the last tweet (for threads)."""
    preview = text[:80].replace('\n', ' ')
    print(f"  {'[reply]' if reply_to_last else '[tweet]'} {preview}...")

    if dry_run:
        print(f"    [DRY RUN]")
        return True

    if reply_to_last:
        # Click on the last tweet to open it, then reply
        await asyncio.sleep(1)
        # Click reply button on the tweet we just posted
        reply_btn = await page.query_selector('[data-testid="reply"]')
        if reply_btn:
            await reply_btn.click()
            await asyncio.sleep(2)
    else:
        # Click the "Post" / compose button in sidebar
        compose_btn = await page.query_selector(
            '[data-testid="SideNav_NewTweet_Button"], '
            'a[href="/compose/post"]'
        )
        if compose_btn:
            await compose_btn.click()
            await asyncio.sleep(2)

    # Find the text editor
    editor = await page.query_selector(
        '[data-testid="tweetTextarea_0"], '
        '[role="textbox"][data-testid], '
        'div[contenteditable="true"][role="textbox"]'
    )

    if not editor:
        # Broader fallback
        editor = await page.query_selector('div[contenteditable="true"]')

    if not editor:
        print("    [ERROR] Could not find tweet editor")
        return False

    await editor.click()
    await asyncio.sleep(0.3)

    # Type with slight delays
    for line in text.split('\n'):
        if line:
            await editor.type(line, delay=random.randint(20, 50))
        await page.keyboard.press('Enter')
        await asyncio.sleep(0.1)

    await asyncio.sleep(1)

    # Click Post button
    post_btn = await page.query_selector(
        '[data-testid="tweetButton"], '
        '[data-testid="tweetButtonInline"]'
    )

    if post_btn:
        await post_btn.click()
        await asyncio.sleep(3)
        print("    [OK]")
        return True
    else:
        print("    [ERROR] Could not find Post button")
        return False


async def post_thread(page, dry_run: bool = False):
    """Post the main thread."""
    print("\nPosting thread...\n")

    for i, tweet in enumerate(THREAD):
        success = await post_tweet(
            page,
            tweet["text"],
            reply_to_last=(i > 0),
            dry_run=dry_run,
        )
        if not success and not dry_run:
            print(f"  Thread broke at tweet {i+1}")
            return
        await asyncio.sleep(random.uniform(2, 5))

    print(f"\nThread posted! ({len(THREAD)} tweets)")


async def post_individual(page, dry_run: bool = False):
    """Post individual standalone tweets."""
    print("\nPosting individual tweets...\n")

    for tweet in INDIVIDUAL_TWEETS:
        await post_tweet(page, tweet["text"], dry_run=dry_run)
        await asyncio.sleep(random.randint(300, 600))

    print(f"\n{len(INDIVIDUAL_TWEETS)} individual tweets posted!")


def log_tweets(tweets: list, dry_run: bool):
    """Log posted tweets."""
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    log_file = LOG_DIR / "tweets.jsonl"
    for tweet in tweets:
        entry = {
            "timestamp": datetime.now().isoformat(),
            "platform": "twitter",
            "text": tweet if isinstance(tweet, str) else tweet.get("text", ""),
            "dry_run": dry_run,
        }
        with open(log_file, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")


async def main():
    args = sys.argv[1:]
    dry_run = "--dry-run" in args
    go = "--go" in args
    thread_only = "--thread" in args

    USER_DATA_DIR.mkdir(parents=True, exist_ok=True)

    # Setup mode
    if "--setup" in args:
        print("Opening browser for Twitter/X login...\n")
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
            await browser.close()
        print("Twitter/X session saved!")
        return

    if not go and not dry_run and not thread_only:
        print("Twitter/X Poster — Port News Desert Outreach")
        print(f"\nThread: {len(THREAD)} tweets")
        print(f"Individual tweets: {len(INDIVIDUAL_TWEETS)}")
        print(f"\nUsage:")
        print(f"  --setup       Log in and save session")
        print(f"  --dry-run     Preview all tweets")
        print(f"  --thread      Post just the main thread")
        print(f"  --go          Post everything (thread + individual)")
        return

    if dry_run:
        print("=" * 60)
        print("DRY RUN — Thread:")
        print("=" * 60)
        for i, tweet in enumerate(THREAD):
            print(f"\n[{i+1}/{len(THREAD)}]")
            print(tweet["text"])
        print(f"\n{'='*60}")
        print("Individual tweets:")
        print("=" * 60)
        for tweet in INDIVIDUAL_TWEETS:
            print(f"\n[{tweet['key']}]")
            print(tweet["text"])
        return

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
        ok = await wait_for_login(page)
        if not ok:
            await browser.close()
            return

        await post_thread(page, dry_run=False)

        if not thread_only:
            print("\nWaiting 10 min before individual tweets...")
            await asyncio.sleep(600)
            await post_individual(page, dry_run=False)

        await browser.close()

    log_tweets([t["text"] for t in THREAD] + [t["text"] for t in INDIVIDUAL_TWEETS], dry_run=False)
    print("\nDone!")


if __name__ == "__main__":
    asyncio.run(main())
