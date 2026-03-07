#!/bin/bash
# ================================================================
# Port News Desert Pipeline — Full automation
#
# Scales to 130+ dead newspaper towns:
#   1. Find Facebook groups for each town
#   2. Scrape posts from each group
#   3. Generate articles from scraped posts
#   4. Post back to each group with links to articles
#
# Usage:
#   ./scripts/scale_pipeline.sh              # Run full pipeline
#   ./scripts/scale_pipeline.sh --step 2     # Run from step 2 (scrape)
#   ./scripts/scale_pipeline.sh --dry-run    # Generate posts but don't publish
# ================================================================

set -e
cd "$(dirname "$0")/.."

STEP=1
DRY_RUN=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --step) STEP="$2"; shift 2;;
        --dry-run) DRY_RUN="--dry-run"; shift;;
        *) shift;;
    esac
done

echo "========================================"
echo "Port News Desert Pipeline"
echo "========================================"
echo "Starting from step: $STEP"
echo ""

# Step 1: Find Facebook groups for all dead newspaper towns
if [ "$STEP" -le 1 ]; then
    echo "[Step 1/4] Finding Facebook groups for news desert towns..."
    echo "This opens a browser — you may need to log into Facebook."
    echo ""
    python scripts/fb_group_finder.py
    echo ""
    echo "Review scripts/fb_output/found_groups.json before continuing."
    echo "Press Enter to continue to scraping, or Ctrl+C to stop."
    read -r
fi

# Step 2: Scrape posts from found groups
if [ "$STEP" -le 2 ]; then
    echo "[Step 2/4] Scraping posts from found groups..."
    echo ""

    # Read found groups and scrape each one
    python3 -c "
import json
data = json.load(open('scripts/fb_output/found_groups.json'))
for town_key, town_data in data['towns'].items():
    groups = town_data.get('groups', [])
    if groups:
        # Pick the group with most members
        best = sorted(groups, key=lambda g: g.get('member_count', 0), reverse=True)[0]
        print(best['url'])
" | while read -r url; do
        echo "  Scraping: $url"
        python scripts/fb_scraper.py "$url" --scroll 15 || true
        sleep 5
    done

    echo ""
fi

# Step 3: Generate articles from scraped posts
if [ "$STEP" -le 3 ]; then
    echo "[Step 3/4] Generating articles from scraped content..."
    echo ""
    python scripts/generate_articles.py
    echo ""
fi

# Step 4: Post to groups
if [ "$STEP" -le 4 ]; then
    echo "[Step 4/4] Posting to Facebook groups..."
    echo ""
    python scripts/fb_poster.py --all $DRY_RUN
    echo ""
fi

echo "========================================"
echo "Pipeline complete!"
echo "========================================"
