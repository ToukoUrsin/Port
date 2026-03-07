"""
Facebook Group Post Scraper using Playwright.

Usage:
    python scripts/fb_scraper.py [GROUP_URL] [--scroll N]

First run: a browser window opens for you to log into Facebook.
After login, the session is saved so subsequent runs are automatic.

Outputs:
    scripts/fb_output/posts.json   — all posts with text + image paths
    scripts/fb_output/images/      — downloaded post images
"""

import asyncio
import json
import os
import sys
import hashlib
import re
from pathlib import Path
from urllib.parse import urlparse

from playwright.async_api import async_playwright

# Config
DEFAULT_GROUP_URL = "https://www.facebook.com/groups/452718004818697"  # Karkkilan Puskaradio
SCROLL_COUNT = 30  # how many times to scroll down (each scroll loads ~3-5 posts)
SCROLL_DELAY_MS = 2000  # wait between scrolls for content to load
OUTPUT_DIR = Path(__file__).parent / "fb_output"
IMAGES_DIR = OUTPUT_DIR / "images"
USER_DATA_DIR = Path(__file__).parent / ".fb_session"  # persistent login


async def wait_for_login(page):
    """Wait for user to log into Facebook if not already logged in."""
    await page.goto("https://www.facebook.com", wait_until="domcontentloaded")
    await asyncio.sleep(3)

    # Check page text for login indicators
    body_text = await page.evaluate("() => document.body.innerText.substring(0, 300)")
    is_login_page = "login" in page.url.lower() or "checkpoint" in page.url.lower()
    has_login_text = "Kirjaudu" in body_text or "Log in" in body_text or "Log Into" in body_text

    # Also check for logged-in indicators
    logged_in = await page.query_selector('[aria-label="Create a post"], [aria-label="Luo julkaisu"], [aria-label="Messenger"], [aria-label="Ilmoitukset"], [aria-label="Notifications"]')

    if logged_in and not is_login_page:
        print("Already logged into Facebook.")
        return

    print("\n" + "=" * 60)
    print("NOT LOGGED IN - Please log into Facebook in the browser window.")
    print("The script will continue automatically after login.")
    print("You have 5 minutes.")
    print("=" * 60 + "\n")

    # Wait for login (max 5 minutes)
    for attempt in range(300):
        await asyncio.sleep(1)
        try:
            logged_in = await page.query_selector('[aria-label="Create a post"], [aria-label="Luo julkaisu"], [aria-label="Messenger"], [aria-label="Ilmoitukset"], [aria-label="Notifications"]')
            if logged_in:
                break
            # Also check if URL changed away from login
            if attempt > 5 and not ("login" in page.url.lower()):
                body = await page.evaluate("() => document.body.innerText.substring(0, 200)")
                if "Kirjaudu" not in body and "Log in" not in body:
                    break
        except:
            pass

        if attempt % 30 == 29:
            print(f"  Still waiting for login... ({attempt + 1}s)")

    await asyncio.sleep(3)
    print("Login detected! Session saved for future runs.\n")


async def scroll_and_extract(page, scroll_count):
    """Scroll the page and extract posts incrementally.

    Facebook virtualizes the DOM — posts scrolled off-screen get emptied.
    So we extract after every few scrolls to capture content while it's visible.
    """
    print(f"Scrolling and extracting ({scroll_count} scrolls)...")

    all_posts = {}  # keyed by text hash to dedup

    for i in range(scroll_count):
        # Scroll down by ~1.5 viewport heights
        await page.evaluate("window.scrollBy(0, window.innerHeight * 1.5)")
        await asyncio.sleep(SCROLL_DELAY_MS / 1000)

        # Click any "Näytä lisää" / "See more" in viewport
        try:
            buttons = await page.query_selector_all('[role="button"]')
            for btn in buttons:
                try:
                    text = await btn.inner_text()
                    if text and text.strip() in ('Näytä lisää', 'See more', 'Katso lisää'):
                        if await btn.is_visible():
                            await btn.click()
                            await asyncio.sleep(0.3)
                except:
                    pass
        except:
            pass

        # Extract currently visible posts every 2 scrolls
        if (i + 1) % 2 == 0 or i == 0:
            batch = await extract_posts_from_viewport(page)
            for post in batch:
                # Create a dedup key from text + first image
                key = post.get('text', '')[:100] + '|' + (post.get('images', [''])[0] if post.get('images') else '')
                if key not in all_posts and (post.get('text', '').strip() or post.get('images')):
                    all_posts[key] = post

        if (i + 1) % 5 == 0:
            print(f"  Scrolled {i + 1}/{scroll_count}... ({len(all_posts)} unique posts so far)")

    print(f"Scrolling complete. Collected {len(all_posts)} unique posts.")
    return list(all_posts.values())


async def extract_posts_from_viewport(page):
    """Extract posts currently rendered in the viewport."""
    return await page.evaluate("""() => {
        const posts = [];

        // Get all articles, filter to top-level (not comments)
        const allArticles = document.querySelectorAll('[role="article"]');
        const articles = Array.from(allArticles).filter(el => !el.parentElement?.closest('[role="article"]'));

        for (const article of articles) {
            // Skip empty virtualized articles
            if (!article.innerText || article.innerText.trim().length < 10) continue;

            const post = { text: '', images: [], author: '', timestamp: '', links: [] };

            // Extract text: get all dir="auto" elements
            const dirAutoElements = article.querySelectorAll('[dir="auto"]');
            const textParts = [];
            const seen = new Set();

            const uiPatterns = ['Tykkää', 'Kommentoi', 'Jaa', 'Like', 'Comment', 'Share',
                'Vastaa', 'Reply', 'Näytä lisää', 'See more', 'Muokkaa', 'Poista',
                'Kirjoita kommentti', 'Write a comment', 'jäsentä', 'julkaisua',
                'Kaikki kommentit', 'Olennaisimmat', 'Liity ryhmään', 'Kirjaudu',
                'Tietoja', 'Keskustelu', 'Suositeltu', 'Tapahtumat', 'Media',
                'Näytä osuvin', 'Näytä ensin', 'Näytä uusimmat', 'Näytä kaikki',
                'Kutsu', 'Ilmoita', 'Piilota', 'Poista julkaisu'];

            for (const el of dirAutoElements) {
                const text = el.innerText?.trim();
                if (!text || text.length < 10 || seen.has(text)) continue;
                if (uiPatterns.some(ui => text === ui || text.startsWith(ui))) continue;

                // Skip single-word short items (names, labels)
                if (text.length < 20 && !text.includes(' ')) continue;

                // Check nesting - skip if contained in already captured text
                let isNested = false;
                for (const s of seen) {
                    if (s.includes(text)) { isNested = true; break; }
                }
                if (isNested) continue;

                // Remove already captured text that this one contains
                for (const s of seen) {
                    if (text.includes(s)) {
                        const idx = textParts.indexOf(s);
                        if (idx > -1) textParts.splice(idx, 1);
                        seen.delete(s);
                    }
                }

                seen.add(text);
                textParts.push(text);
            }

            post.text = textParts.join('\\n').trim();

            // Extract images
            const images = article.querySelectorAll('img');
            for (const img of images) {
                const src = img.src || img.getAttribute('data-src') || '';
                if (!src) continue;
                const isContent = src.includes('scontent') || src.includes('fbcdn.net');
                const isBigEnough = (img.width > 80 || img.naturalWidth > 80);
                const isSmallIcon = img.width < 40 && img.height < 40;
                if (isContent && isBigEnough && !isSmallIcon && !post.images.includes(src)) {
                    post.images.push(src);
                }
            }

            // Author
            const authorEls = article.querySelectorAll('h2 a, h3 a, h4 a, strong a, a[role="link"] strong, strong span a');
            for (const el of authorEls) {
                const name = el.innerText?.trim();
                if (name && name.length > 2 && name.length < 60 && !name.includes('\\n')) {
                    post.author = name;
                    break;
                }
            }

            // Timestamp
            const spans = article.querySelectorAll('span, a');
            for (const span of spans) {
                const t = span.innerText?.trim();
                if (!t) continue;
                if (t.match(/^\\d+\\s*(t|h|min|pv|d|vk|w|kk|s|tuntia|minuuttia|päivää|viikkoa)/) ||
                    t.match(/^(eilen|tänään|yesterday|today|juuri nyt|just now)/i) ||
                    t.match(/^\\d{1,2}\\.\\s*(tammi|helmi|maalis|huhti|touko|kesä|heinä|elo|syys|loka|marras|joulu)/i)) {
                    post.timestamp = t;
                    break;
                }
            }

            // External links
            const postLinks = article.querySelectorAll('a[href]');
            for (const link of postLinks) {
                const href = link.href;
                if (href && !href.includes('facebook.com') && !href.includes('#') && href.startsWith('http')) {
                    post.links.push(href);
                }
            }

            if (post.text.length > 5 || post.images.length > 0) {
                posts.push(post);
            }
        }
        return posts;
    }""")


async def extract_posts(page):
    """Extract posts from the loaded Facebook group page."""

    posts = await page.evaluate("""() => {
        const posts = [];
        const seenTexts = new Set();

        // Get all role="article" elements, then filter to only top-level posts
        // (not comments nested inside other articles)
        const allArticles = document.querySelectorAll('[role="article"]');
        const articles = Array.from(allArticles).filter(el => {
            // Check if this article is inside another article (=comment)
            const parent = el.parentElement?.closest('[role="article"]');
            return !parent;
        });

        for (const article of articles) {
            const post = { text: '', images: [], author: '', timestamp: '', links: [] };

            // Strategy 1: data-ad-comet-preview="message"
            const msgContainers = article.querySelectorAll('[data-ad-comet-preview="message"], [data-ad-preview="message"]');
            if (msgContainers.length > 0) {
                for (const tc of msgContainers) {
                    post.text += tc.innerText + '\\n';
                }
            }

            // Strategy 2: dir="auto" elements with substantial text (always run as supplement)
            if (true) {
                const dirAutoElements = article.querySelectorAll('[dir="auto"]');
                const seen = new Set();
                const textParts = [];

                for (const el of dirAutoElements) {
                    const text = el.innerText?.trim();
                    if (!text || text.length < 15 || seen.has(text)) continue;

                    // Skip known UI strings
                    const uiPatterns = ['Tykkää', 'Kommentoi', 'Jaa', 'Like', 'Comment', 'Share',
                        'Vastaa', 'Reply', 'Näytä lisää', 'See more', 'Muokkaa', 'Poista',
                        'Kirjoita kommentti', 'Write a comment', 'jäsentä', 'julkaisua',
                        'Kaikki kommentit', 'Olennaisimmat', 'Liity ryhmään', 'Kirjaudu',
                        'Tietoja', 'Keskustelu', 'Suositeltu', 'Tapahtumat', 'Media',
                        'Näytä osuvin', 'Näytä ensin', 'Näytä uusimmat'];
                    if (uiPatterns.some(ui => text.startsWith(ui) || text === ui)) continue;

                    // Skip if it's just a single word (likely a name or label)
                    if (text.length < 20 && !text.includes(' ')) continue;

                    // Check if this element is nested inside another dir="auto" we already captured
                    let isNested = false;
                    for (const captured of seen) {
                        if (captured.includes(text) && captured !== text) {
                            isNested = true;
                            break;
                        }
                    }
                    if (isNested) continue;

                    seen.add(text);
                    textParts.push(text);
                }

                // Use all meaningful text parts, longest first
                if (textParts.length > 0) {
                    textParts.sort((a, b) => b.length - a.length);
                    // Combine unique parts, don't repeat if one contains another
                    const combined = [];
                    for (const part of textParts) {
                        const isDuplicate = combined.some(c => c.includes(part) || part.includes(c));
                        if (!isDuplicate) combined.push(part);
                    }
                    if (!post.text.trim()) {
                        post.text = combined.join('\\n');
                    }
                }
            }

            // Extract images - look for all img elements with substantial size
            const images = article.querySelectorAll('img');
            for (const img of images) {
                const src = img.src || img.getAttribute('data-src') || '';
                if (!src) continue;

                // Filter: only post images (not emojis, avatars, UI icons)
                const isEmoji = src.includes('emoji') || src.includes('/images/') && img.width < 30;
                const isStatic = src.includes('rsrc.php') || src.includes('static');
                const isContent = src.includes('scontent') || src.includes('fbcdn.net');
                const isBigEnough = img.width > 80 || img.naturalWidth > 80;
                const isAvatar = img.closest('[role="img"]') && (img.width < 60 || img.height < 60);

                if (isContent && isBigEnough && !isEmoji && !isStatic && !isAvatar) {
                    // Avoid duplicate image URLs
                    if (!post.images.includes(src)) {
                        post.images.push(src);
                    }
                }
            }

            // Extract author: look for links that are people's names
            const headerLinks = article.querySelectorAll('h2 a, h3 a, h4 a, strong a, strong span, a[role="link"] > strong');
            for (const link of headerLinks) {
                const name = link.innerText?.trim();
                if (name && name.length > 2 && name.length < 50 && !name.includes('\\n')) {
                    post.author = name;
                    break;
                }
            }

            // Extract timestamp - look for time-like text near top of post
            const spans = article.querySelectorAll('span, a');
            for (const span of spans) {
                const t = span.innerText?.trim();
                if (!t) continue;
                // Match Finnish/English relative timestamps
                if (t.match(/^\\d+\\s*(t|h|min|pv|d|vk|w|kk|s|tuntia|minuuttia|päivää|viikkoa)/) ||
                    t.match(/^(eilen|tänään|yesterday|today|juuri nyt|just now)/i) ||
                    t.match(/^\\d{1,2}\\.\\s*(tammi|helmi|maalis|huhti|touko|kesä|heinä|elo|syys|loka|marras|joulu)/i)) {
                    post.timestamp = t;
                    break;
                }
            }

            // Extract external links
            const postLinks = article.querySelectorAll('a[href]');
            for (const link of postLinks) {
                const href = link.href;
                if (href && !href.includes('facebook.com') && !href.includes('#')
                    && href.startsWith('http')) {
                    post.links.push(href);
                }
            }

            post.text = post.text.trim();

            // Dedup: skip if we already have this exact text
            if (seenTexts.has(post.text)) continue;
            if (post.text) seenTexts.add(post.text);

            // Include if has meaningful content
            if (post.text.length > 10 || post.images.length > 0) {
                posts.push(post);
            }
        }

        return posts;
    }""")

    return posts


async def download_images(page, posts):
    """Download all post images."""
    IMAGES_DIR.mkdir(parents=True, exist_ok=True)

    downloaded = 0
    for i, post in enumerate(posts):
        new_image_paths = []
        for j, img_url in enumerate(post.get('images', [])):
            # Create filename from URL hash
            url_hash = hashlib.md5(img_url.encode()).hexdigest()[:12]
            ext = '.jpg'
            filename = f"post_{i:03d}_img_{j}_{url_hash}{ext}"
            filepath = IMAGES_DIR / filename

            if not filepath.exists():
                try:
                    response = await page.request.get(img_url)
                    if response.ok:
                        content = await response.body()
                        filepath.write_bytes(content)
                        downloaded += 1
                except Exception as e:
                    print(f"  Failed to download image: {e}")
                    filepath = None

            if filepath:
                new_image_paths.append(str(filepath))

        post['local_images'] = new_image_paths

    print(f"Downloaded {downloaded} new images.")
    return posts


GROUPS = {
    "kemi": ("https://www.facebook.com/groups/239350891413816", "Puskaradio Meri-Lappi"),
    "loviisa": ("https://www.facebook.com/groups/1645aborginpuskaradio", "Loviisan Puskaradio"),
    "enontekio": ("https://www.facebook.com/groups/enontekio", "Enontekiö"),
    "salla": ("https://www.facebook.com/groups/sallanpuskaradio", "Sallan Puskaradio"),
    "turku": ("https://www.facebook.com/groups/turkupuskaradio", "Puskaradio Turku"),
}


async def scrape_group(page, group_url, group_name, scroll_count, output_dir):
    """Scrape a single group and save results."""
    group_output = output_dir / group_name.lower().replace(" ", "_")
    group_output.mkdir(parents=True, exist_ok=True)
    images_dir = group_output / "images"
    images_dir.mkdir(exist_ok=True)

    print(f"\n{'='*60}")
    print(f"Scraping: {group_name} ({group_url})")
    print(f"{'='*60}")

    await page.goto(group_url, wait_until="domcontentloaded")
    await asyncio.sleep(3)

    # Dismiss popups
    try:
        cookie_btn = await page.query_selector('button[data-cookiebanner="accept_button"], [aria-label="Allow all cookies"], [aria-label="Salli kaikki evästeet"]')
        if cookie_btn:
            await cookie_btn.click()
            await asyncio.sleep(1)
    except:
        pass

    posts = await scroll_and_extract(page, scroll_count)
    print(f"Collected {len(posts)} posts")

    # Download images into group-specific folder
    downloaded = 0
    for i, post in enumerate(posts):
        local_paths = []
        for j, img_url in enumerate(post.get('images', [])):
            url_hash = hashlib.md5(img_url.encode()).hexdigest()[:12]
            filepath = images_dir / f"post_{i:03d}_img_{j}_{url_hash}.jpg"
            if not filepath.exists():
                try:
                    response = await page.request.get(img_url)
                    if response.ok:
                        filepath.write_bytes(await response.body())
                        downloaded += 1
                except:
                    filepath = None
            if filepath:
                local_paths.append(str(filepath))
        post['local_images'] = local_paths

    print(f"Downloaded {downloaded} images")

    output_file = group_output / "posts.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump({
            "group_url": group_url,
            "group_name": group_name,
            "post_count": len(posts),
            "posts": posts
        }, f, ensure_ascii=False, indent=2)

    texts = sum(1 for p in posts if p.get('text', '').strip())
    imgs = sum(1 for p in posts if p.get('local_images'))
    print(f"Saved: {texts} with text, {imgs} with images -> {output_file}")
    return posts


async def main():
    scroll_count = SCROLL_COUNT
    group_urls = []

    # Parse arguments
    args = sys.argv[1:]
    i = 0
    while i < len(args):
        if args[i] == "--scroll" and i + 1 < len(args):
            scroll_count = int(args[i + 1])
            i += 2
        elif not args[i].startswith("--"):
            group_urls.append(args[i])
            i += 1
        else:
            i += 1

    # If no URLs given, use default
    if not group_urls:
        group_urls = [DEFAULT_GROUP_URL]

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    USER_DATA_DIR.mkdir(parents=True, exist_ok=True)

    print(f"Groups to scrape: {len(group_urls)}")
    print(f"Scroll count per group: {scroll_count}")
    print()

    async with async_playwright() as p:
        browser = await p.chromium.launch_persistent_context(
            str(USER_DATA_DIR),
            headless=False,
            viewport={"width": 1280, "height": 900},
            locale="fi-FI",
        )

        page = browser.pages[0] if browser.pages else await browser.new_page()
        await wait_for_login(page)

        for group_url in group_urls:
            # Check if it's a shortname from GROUPS dict
            if group_url in GROUPS:
                url, name = GROUPS[group_url]
            else:
                url = group_url
                # Extract group name from URL
                name = url.rstrip('/').split('/')[-1]

            await scrape_group(page, url, name, scroll_count, OUTPUT_DIR)

        await browser.close()
    print("\nAll done!")


if __name__ == "__main__":
    asyncio.run(main())
