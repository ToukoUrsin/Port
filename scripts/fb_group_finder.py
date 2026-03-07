"""
Facebook Group Finder — automatically find community groups for news desert towns.

Given a list of towns, searches Facebook for their community groups and saves
the results so they can be fed into fb_scraper.py and fb_poster.py.

Usage:
    # Find groups for all towns in the dead newspapers list
    python scripts/fb_group_finder.py

    # Find groups for specific towns
    python scripts/fb_group_finder.py --town "Chesterton, Indiana" --town "Laurel, Mississippi"

    # Set minimum member count
    python scripts/fb_group_finder.py --min-members 500

Outputs:
    scripts/fb_output/found_groups.json

Requires:
    pip install playwright
"""

import asyncio
import json
import sys
import re
from pathlib import Path

from playwright.async_api import async_playwright

USER_DATA_DIR = Path(__file__).parent / ".fb_session"
OUTPUT_FILE = Path(__file__).parent / "fb_output" / "found_groups.json"

# ===================================================================
# Dead newspapers → towns to find groups for
# Sources: Northwestern Medill, UNC news desert project, public records
# ===================================================================

DEAD_NEWSPAPERS = [
    # Format: (town, state, newspaper, year_closed, population)
    # --- Already scraped (have articles) ---
    ("Chesterton", "Indiana", "Chesterton Tribune", 2025, 14800),
    ("Claremont", "New Hampshire", "Eagle Times", 2025, 13000),
    ("Laurel", "Mississippi", "Laurel Leader-Call", 2025, 17500),
    ("Spencer", "Tennessee", "No surviving paper (9 attempts)", 2015, 1600),
    # --- New targets to find groups for ---
    ("Madisonville", "Kentucky", "Madisonville Messenger", 2024, 19000),
    ("Bardstown", "Kentucky", "Kentucky Standard (reduced)", 2024, 13500),
    ("Brookings", "South Dakota", "Brookings Register (reduced)", 2024, 24000),
    ("Elkin", "North Carolina", "Elkin Tribune", 2024, 4000),
    ("Paintsville", "Kentucky", "Paintsville Herald", 2024, 3500),
    ("Millinocket", "Maine", "Katahdin Times (closed)", 2023, 4000),
    ("Cairo", "Illinois", "Cairo Citizen (closed decades ago)", 2000, 1800),
    ("Wauchula", "Florida", "Herald-Advocate (reduced)", 2024, 5600),
    ("Centralia", "Washington", "Chronicle (reduced)", 2024, 17500),
    ("Orangeburg", "South Carolina", "Times and Democrat (reduced)", 2024, 12600),
    ("Galloway", "New Jersey", "Local papers consolidated", 2024, 37000),
    ("Globe", "Arizona", "Arizona Silver Belt (reduced)", 2024, 7500),
    ("Kingman", "Arizona", "Kingman Daily Miner (reduced)", 2024, 30000),
    ("Klamath Falls", "Oregon", "Herald and News (reduced)", 2024, 22000),
    ("Ely", "Nevada", "Ely Times (reduced)", 2024, 4000),
    ("Galax", "Virginia", "Galax Gazette (closed)", 2023, 6500),
    ("Madison", "Florida", "Madison Enterprise-Recorder", 2024, 2800),
    ("Vinton", "Ohio", "Vinton County Courier (closed)", 2023, 13000),
    # --- Larger towns, higher potential ---
    ("Youngstown", "Ohio", "Vindicator (closed)", 2019, 60000),
    ("Muncie", "Indiana", "Star Press (gutted)", 2023, 65000),
    ("Topeka", "Kansas", "Topeka Capital-Journal (gutted)", 2023, 127000),
    ("Duluth", "Minnesota", "Duluth News Tribune (reduced)", 2024, 90000),
    ("Stockton", "California", "Stockton Record (closed)", 2023, 320000),
    ("Missoula", "Montana", "Missoulian (reduced)", 2024, 75000),
    ("Santa Cruz", "California", "Santa Cruz Sentinel (reduced)", 2024, 65000),
    ("Norfolk", "Virginia", "Virginian-Pilot (gutted by Tribune)", 2023, 240000),
    ("Allentown", "Pennsylvania", "Morning Call (gutted by Tribune)", 2023, 125000),
    ("Anniston", "Alabama", "Anniston Star (closed)", 2024, 21000),
]


def _parse_member_count(text: str) -> int:
    """Parse Facebook member count text like '12.3K members' or '1,234 members'."""
    text = text.lower().replace(",", "").replace(" ", "")
    match = re.search(r"([\d.]+)\s*k", text)
    if match:
        return int(float(match.group(1)) * 1000)
    match = re.search(r"([\d.]+)\s*m", text)
    if match:
        return int(float(match.group(1)) * 1000000)
    match = re.search(r"(\d+)", text)
    if match:
        return int(match.group(1))
    return 0


async def wait_for_login(page):
    """Wait for user to log into Facebook if not already logged in."""
    await page.goto("https://www.facebook.com", wait_until="domcontentloaded")
    await asyncio.sleep(3)

    logged_in = await page.query_selector(
        '[aria-label="Create a post"], [aria-label="Luo julkaisu"], '
        '[aria-label="Messenger"], [aria-label="Ilmoitukset"], '
        '[aria-label="Notifications"]'
    )

    if logged_in:
        print("Already logged into Facebook.")
        return

    print("\n" + "=" * 60)
    print("NOT LOGGED IN — log in via the browser window.")
    print("=" * 60 + "\n")

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
            print(f"  Waiting for login... ({attempt + 1}s)")

    await asyncio.sleep(3)
    print("Login detected!\n")


async def find_groups_for_town(page, town: str, state: str, min_members: int = 100) -> list:
    """Search Facebook for community groups in a specific town."""
    search_queries = [
        f"{town} {state} community",
        f"{town} {state}",
        f"What's happening in {town}",
        f"{town} news",
    ]

    found_groups = []
    seen_urls = set()

    for query in search_queries[:2]:  # Only try first 2 queries to save time
        search_url = f"https://www.facebook.com/search/groups/?q={query.replace(' ', '%20')}"
        await page.goto(search_url, wait_until="domcontentloaded")
        await asyncio.sleep(3)

        # Scroll once to load more results
        await page.evaluate("window.scrollBy(0, window.innerHeight)")
        await asyncio.sleep(2)

        # Extract group results
        groups = await page.evaluate("""() => {
            const results = [];
            // Look for group links in search results
            const links = document.querySelectorAll('a[href*="/groups/"]');
            for (const link of links) {
                const href = link.href;
                if (!href || href.includes('/groups/search') || href.includes('/groups/feed'))
                    continue;

                // Get the group name - look for text in the link or nearby
                const container = link.closest('[role="article"]') ||
                                  link.closest('[class]')?.parentElement?.parentElement;
                if (!container) continue;

                const name = link.innerText?.trim() ||
                             container.querySelector('span')?.innerText?.trim() || '';
                if (!name || name.length < 3) continue;

                // Look for member count text nearby
                const allText = container.innerText || '';
                let members = '';
                const memberMatch = allText.match(/([\d,.]+[KkMm]?)\s*(members|jäsentä)/);
                if (memberMatch) {
                    members = memberMatch[0];
                }

                // Extract clean group URL
                const urlMatch = href.match(/facebook\\.com\\/groups\\/([^/?]+)/);
                const groupSlug = urlMatch ? urlMatch[1] : '';

                if (groupSlug && name.length > 2) {
                    results.push({
                        name: name.substring(0, 100),
                        url: 'https://www.facebook.com/groups/' + groupSlug,
                        slug: groupSlug,
                        members_text: members,
                    });
                }
            }
            return results;
        }""")

        for g in groups:
            if g["url"] not in seen_urls:
                seen_urls.add(g["url"])
                g["member_count"] = _parse_member_count(g.get("members_text", ""))
                if g["member_count"] >= min_members or g["member_count"] == 0:
                    found_groups.append(g)

    return found_groups


async def main():
    args = sys.argv[1:]
    min_members = 100
    specific_towns = []

    i = 0
    while i < len(args):
        if args[i] == "--town" and i + 1 < len(args):
            specific_towns.append(args[i + 1])
            i += 2
        elif args[i] == "--min-members" and i + 1 < len(args):
            min_members = int(args[i + 1])
            i += 2
        else:
            i += 1

    # Filter to specific towns if provided
    if specific_towns:
        targets = []
        for town_str in specific_towns:
            parts = [p.strip() for p in town_str.split(",")]
            if len(parts) == 2:
                targets.append((parts[0], parts[1], "Unknown", 2024, 0))
            else:
                targets.append((parts[0], "", "Unknown", 2024, 0))
    else:
        targets = DEAD_NEWSPAPERS

    print(f"Searching for Facebook groups in {len(targets)} towns...")
    print(f"Minimum member count: {min_members}\n")

    USER_DATA_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)

    # Load existing results to avoid re-searching
    existing = {}
    if OUTPUT_FILE.exists():
        existing = json.loads(OUTPUT_FILE.read_text())

    async with async_playwright() as p:
        browser = await p.chromium.launch_persistent_context(
            str(USER_DATA_DIR),
            headless=False,
            viewport={"width": 1280, "height": 900},
            locale="en-US",
        )

        page = browser.pages[0] if browser.pages else await browser.new_page()
        await wait_for_login(page)

        all_results = existing.get("towns", {})

        for idx, (town, state, newspaper, year, pop) in enumerate(targets):
            key = f"{town.lower()}_{state.lower()}"

            if key in all_results and not specific_towns:
                print(f"[{idx+1}/{len(targets)}] {town}, {state} — already searched, skipping")
                continue

            print(f"[{idx+1}/{len(targets)}] Searching: {town}, {state} (lost: {newspaper})...", end=" ", flush=True)

            try:
                groups = await find_groups_for_town(page, town, state, min_members)
                all_results[key] = {
                    "town": town,
                    "state": state,
                    "newspaper": newspaper,
                    "year_closed": year,
                    "population": pop,
                    "groups": groups,
                }
                print(f"found {len(groups)} groups")

                # Print top groups
                for g in sorted(groups, key=lambda x: x["member_count"], reverse=True)[:3]:
                    print(f"    {g['name'][:50]:50s} {g['members_text']:>15s}  {g['url']}")

            except Exception as e:
                print(f"error: {e}")
                all_results[key] = {
                    "town": town, "state": state, "newspaper": newspaper,
                    "year_closed": year, "population": pop,
                    "groups": [], "error": str(e),
                }

            # Save after each town (in case of crash)
            output = {
                "total_towns": len(all_results),
                "total_groups": sum(len(t["groups"]) for t in all_results.values()),
                "towns": all_results,
            }
            OUTPUT_FILE.write_text(json.dumps(output, ensure_ascii=False, indent=2))

            # Delay between searches
            if idx < len(targets) - 1:
                await asyncio.sleep(3)

        await browser.close()

    # Summary
    total_groups = sum(len(t["groups"]) for t in all_results.values())
    towns_with_groups = sum(1 for t in all_results.values() if t["groups"])
    print(f"\n{'='*60}")
    print(f"Done! Found {total_groups} groups across {towns_with_groups}/{len(all_results)} towns")
    print(f"Results saved to {OUTPUT_FILE}")
    print(f"\nNext steps:")
    print(f"  1. Review found_groups.json and pick the best group per town")
    print(f"  2. Run fb_scraper.py on each group to get content")
    print(f"  3. Run generate_articles.py to create articles")
    print(f"  4. Run fb_poster.py to post back to the groups")


if __name__ == "__main__":
    asyncio.run(main())
