"""
Multi-account Facebook poster — rotates between accounts to scale safely.

Each account gets its own persistent browser session. Posts are distributed
evenly across accounts with safe daily limits.

Usage:
    # Set up accounts (run once per account — logs in and saves session)
    python scripts/multi_account_poster.py --setup account1
    python scripts/multi_account_poster.py --setup account2
    python scripts/multi_account_poster.py --setup account3
    python scripts/multi_account_poster.py --setup account4

    # Dry run across all accounts
    python scripts/multi_account_poster.py --dry-run

    # Post to all groups, rotating accounts
    python scripts/multi_account_poster.py --go

    # Post to Finnish groups only
    python scripts/multi_account_poster.py --go --fi

    # Post to US groups only
    python scripts/multi_account_poster.py --go --us

    # Resume from where we left off (reads log to skip already-posted groups)
    python scripts/multi_account_poster.py --go --resume

Requires:
    pip install playwright anthropic python-dotenv
"""

import asyncio
import json
import os
import sys
import random
from datetime import datetime, date
from pathlib import Path
from dotenv import load_dotenv

from playwright.async_api import async_playwright

PROJECT_ROOT = Path(__file__).parent.parent
load_dotenv(PROJECT_ROOT / "backend" / ".env")
load_dotenv(PROJECT_ROOT / ".env")

SESSIONS_DIR = Path(__file__).parent / ".fb_sessions"
LOG_DIR = Path(__file__).parent / "fb_output" / "post_log"
DAILY_LIMIT = 15  # max posts per account per day

# Import targets and generation from fb_poster
sys.path.insert(0, str(Path(__file__).parent))
from fb_poster import ALL_TARGETS, TARGETS_FI, TARGETS_US, generate_post, post_to_group


def get_accounts() -> list[str]:
    """List all configured account sessions."""
    if not SESSIONS_DIR.exists():
        return []
    return sorted([d.name for d in SESSIONS_DIR.iterdir() if d.is_dir()])


def get_posted_groups() -> set[str]:
    """Read log to find already-posted group URLs."""
    log_file = LOG_DIR / "posts.jsonl"
    posted = set()
    if log_file.exists():
        for line in log_file.read_text().splitlines():
            try:
                entry = json.loads(line)
                if entry.get("success") and not entry.get("dry_run"):
                    posted.add(entry.get("group_url", ""))
            except:
                pass
    return posted


def get_today_count(account: str) -> int:
    """Count how many posts this account made today."""
    log_file = LOG_DIR / "posts.jsonl"
    if not log_file.exists():
        return 0
    today = date.today().isoformat()
    count = 0
    for line in log_file.read_text().splitlines():
        try:
            entry = json.loads(line)
            if (entry.get("account") == account and
                entry.get("timestamp", "").startswith(today) and
                entry.get("success") and not entry.get("dry_run")):
                count += 1
        except:
            pass
    return count


def log_post(account: str, town_key: str, target: dict, message: str,
             success: bool, dry_run: bool):
    """Log post with account info."""
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    log_file = LOG_DIR / "posts.jsonl"

    entry = {
        "timestamp": datetime.now().isoformat(),
        "account": account,
        "town": town_key,
        "group_name": target["group_name"],
        "group_url": target["group_url"],
        "lang": target["lang"],
        "message": message,
        "success": success,
        "dry_run": dry_run,
    }

    with open(log_file, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


async def setup_account(account_name: str):
    """Open browser for manual Facebook login, auto-detect when done."""
    session_dir = SESSIONS_DIR / account_name
    session_dir.mkdir(parents=True, exist_ok=True)

    print(f"Setting up account: {account_name}")
    print(f"Session dir: {session_dir}")
    print("A browser will open — log into Facebook.")
    print("The script will detect login automatically and save the session.\n")

    async with async_playwright() as p:
        browser = await p.chromium.launch_persistent_context(
            str(session_dir),
            headless=False,
            viewport={"width": 1280, "height": 900},
            locale="en-US",
        )
        page = browser.pages[0] if browser.pages else await browser.new_page()
        await page.goto("https://www.facebook.com", wait_until="domcontentloaded")
        await asyncio.sleep(3)

        # Check if already logged in
        logged_in = await page.query_selector(
            '[aria-label="Create a post"], [aria-label="Luo julkaisu"], '
            '[aria-label="Messenger"], [aria-label="Ilmoitukset"], '
            '[aria-label="Notifications"]'
        )

        if logged_in:
            print(f"Already logged in! Session saved for {account_name}.")
            await browser.close()
            return

        print("Waiting for login... (5 min timeout)")

        for attempt in range(300):
            await asyncio.sleep(1)
            try:
                logged_in = await page.query_selector(
                    '[aria-label="Create a post"], [aria-label="Luo julkaisu"], '
                    '[aria-label="Messenger"], [aria-label="Ilmoitukset"], '
                    '[aria-label="Notifications"]'
                )
                if logged_in:
                    break
            except:
                pass
            if attempt % 30 == 29:
                print(f"  Still waiting... ({attempt + 1}s)")

        await asyncio.sleep(2)
        await browser.close()

    print(f"Session saved for {account_name}!\n")


async def run_account_batch(account: str, targets: list[tuple[str, dict]],
                            dry_run: bool) -> int:
    """Run a batch of posts for one account."""
    session_dir = SESSIONS_DIR / account
    if not session_dir.exists():
        print(f"[{account}] No session found. Run --setup {account} first.")
        return 0

    today_count = get_today_count(account)
    remaining = DAILY_LIMIT - today_count
    if remaining <= 0:
        print(f"[{account}] Daily limit reached ({DAILY_LIMIT} posts today). Skipping.")
        return 0

    batch = targets[:remaining]
    print(f"\n[{account}] Posting {len(batch)} groups (today: {today_count}/{DAILY_LIMIT})")

    posted = 0

    async with async_playwright() as p:
        browser = await p.chromium.launch_persistent_context(
            str(session_dir),
            headless=False,
            viewport={"width": 1280, "height": 900},
            locale="en-US",
        )

        page = browser.pages[0] if browser.pages else await browser.new_page()

        # Quick login check
        await page.goto("https://www.facebook.com", wait_until="domcontentloaded")
        await asyncio.sleep(3)
        logged_in = await page.query_selector(
            '[aria-label="Create a post"], [aria-label="Luo julkaisu"], '
            '[aria-label="Messenger"], [aria-label="Notifications"]'
        )
        if not logged_in:
            print(f"[{account}] Not logged in! Run --setup {account}")
            await browser.close()
            return 0

        for idx, (town_key, target) in enumerate(batch):
            print(f"\n[{account}] [{idx+1}/{len(batch)}] {target['group_name']} ({target['town']})")

            # Generate post
            message = await generate_post(town_key, target)

            if dry_run:
                print(f"  [DRY RUN] Would post:\n  {message[:100]}...")
                log_post(account, town_key, target, message, True, True)
                posted += 1
            else:
                success = await post_to_group(page, target, message)
                log_post(account, town_key, target, message, success, False)
                if success:
                    posted += 1

                # Human-like delay between posts (2-5 min)
                if idx < len(batch) - 1:
                    delay = random.randint(120, 300)
                    print(f"  Waiting {delay}s...")
                    await asyncio.sleep(delay)

        await browser.close()

    return posted


async def main():
    args = sys.argv[1:]

    # Setup mode
    if "--setup" in args:
        idx = args.index("--setup")
        if idx + 1 < len(args):
            await setup_account(args[idx + 1])
        else:
            print("Usage: --setup <account_name>")
        return

    dry_run = "--dry-run" in args
    resume = "--resume" in args
    go = "--go" in args
    fi_only = "--fi" in args
    us_only = "--us" in args

    if not go and not dry_run:
        accounts = get_accounts()
        print("Multi-Account Facebook Poster")
        print(f"\nAccounts configured: {len(accounts)}")
        for a in accounts:
            today = get_today_count(a)
            print(f"  {a}: {today}/{DAILY_LIMIT} posts today")
        print(f"\nTotal targets: {len(ALL_TARGETS)} groups")
        posted = get_posted_groups()
        print(f"Already posted: {len(posted)} groups")
        print(f"Remaining: {len(ALL_TARGETS) - len(posted)} groups")
        print(f"\nUsage:")
        print(f"  --setup <name>   Set up a new account")
        print(f"  --go             Start posting")
        print(f"  --go --resume    Resume (skip already-posted groups)")
        print(f"  --go --fi        Finnish groups only")
        print(f"  --go --us        US groups only")
        print(f"  --dry-run        Preview without posting")
        return

    accounts = get_accounts()
    if not accounts:
        print("No accounts set up! Run:")
        print("  python multi_account_poster.py --setup account1")
        return

    # Build target list
    if fi_only:
        targets = list(TARGETS_FI.items())
    elif us_only:
        targets = list(TARGETS_US.items())
    else:
        targets = list(ALL_TARGETS.items())

    # Filter out already-posted groups if resuming
    if resume:
        posted = get_posted_groups()
        targets = [(k, v) for k, v in targets if v["group_url"] not in posted]
        print(f"Resuming: {len(targets)} groups remaining")

    if not targets:
        print("Nothing to post! All groups already covered.")
        return

    # Distribute targets across accounts round-robin
    account_batches: dict[str, list] = {a: [] for a in accounts}
    for i, target in enumerate(targets):
        account = accounts[i % len(accounts)]
        account_batches[account].append(target)

    print(f"\nDistribution across {len(accounts)} accounts:")
    for account, batch in account_batches.items():
        today = get_today_count(account)
        can_post = min(len(batch), DAILY_LIMIT - today)
        print(f"  {account}: {can_post} groups (limit: {DAILY_LIMIT - today} remaining today)")

    if not dry_run:
        print(f"\nThis will post to real Facebook groups. Continue? [y/N]")
        confirm = input().strip().lower()
        if confirm != "y":
            print("Cancelled.")
            return

    # Run accounts sequentially (each opens its own browser)
    total_posted = 0
    for account, batch in account_batches.items():
        if not batch:
            continue
        count = await run_account_batch(account, batch, dry_run)
        total_posted += count

    print(f"\n{'='*60}")
    print(f"Done! {total_posted} posts {'previewed' if dry_run else 'published'}.")
    posted = get_posted_groups()
    remaining = len(ALL_TARGETS) - len(posted)
    print(f"Total posted (all time): {len(posted)}")
    print(f"Remaining: {remaining}")
    if remaining > 0:
        print(f"Run again tomorrow with --go --resume to continue.")
    print(f"{'='*60}")


if __name__ == "__main__":
    asyncio.run(main())
