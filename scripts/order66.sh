#!/bin/bash
# ================================================================
# ORDER 66 — Full news attack across all platforms
#
# Launches Facebook (multi-account), Reddit, and Twitter posting
# in parallel. Optionally seeds articles for new towns first.
#
# Usage:
#   ./scripts/order66.sh                  # Execute across all platforms
#   ./scripts/order66.sh --dry-run        # Preview everything, post nothing
#   ./scripts/order66.sh --seed           # Generate seed articles first, then post
#   ./scripts/order66.sh --fb-only        # Facebook only
#   ./scripts/order66.sh --reddit-only    # Reddit only
#   ./scripts/order66.sh --twitter-only   # Twitter only
#   ./scripts/order66.sh --fi             # Finnish targets only (FB)
#   ./scripts/order66.sh --us             # US targets only (FB)
# ================================================================

set -e
cd "$(dirname "$0")/.."

DRY_RUN=""
SEED=false
FB=true
REDDIT=true
TWITTER=true
REGION=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --dry-run)  DRY_RUN="--dry-run"; shift;;
        --seed)     SEED=true; shift;;
        --fb-only)  REDDIT=false; TWITTER=false; shift;;
        --reddit-only) FB=false; TWITTER=false; shift;;
        --twitter-only) FB=false; REDDIT=false; shift;;
        --fi)       REGION="--fi"; shift;;
        --us)       REGION="--us"; shift;;
        *)          shift;;
    esac
done

echo "============================================"
echo "  ORDER 66 — News Attack"
echo "============================================"
echo ""
echo "  Facebook:  $FB"
echo "  Reddit:    $REDDIT"
echo "  Twitter:   $TWITTER"
echo "  Dry run:   ${DRY_RUN:-no}"
echo "  Seed:      $SEED"
echo "  Region:    ${REGION:-all}"
echo ""

# ------------------------------------------------------------------
# Step 0: Seed articles for new towns (if --seed)
# ------------------------------------------------------------------
if $SEED; then
    echo "[SEED] Generating articles for new towns..."
    echo "  This calls Anthropic API (~$2 cost for all towns)"
    echo ""
    python scripts/generate_town_articles.py
    echo ""
    echo "[SEED] Done. Articles saved to scripts/generated_articles/"
    echo ""
fi

# ------------------------------------------------------------------
# Launch platforms in parallel
# ------------------------------------------------------------------
PIDS=()
LOG_DIR="scripts/fb_output/post_log"
mkdir -p "$LOG_DIR"

# --- Facebook (multi-account) ---
if $FB; then
    echo "[FB] Launching multi-account Facebook poster..."
    if [ -n "$DRY_RUN" ]; then
        python scripts/multi_account_poster.py $DRY_RUN $REGION > "$LOG_DIR/fb_run.log" 2>&1 &
    else
        # For live posting, multi_account_poster needs stdin for confirmation
        # Run in foreground first, then background the rest
        python scripts/multi_account_poster.py --go --yes $REGION > "$LOG_DIR/fb_run.log" 2>&1 &
    fi
    FB_PID=$!
    PIDS+=($FB_PID)
    echo "  PID: $FB_PID (log: $LOG_DIR/fb_run.log)"
fi

# --- Reddit ---
if $REDDIT; then
    echo "[REDDIT] Launching Reddit poster..."
    if [ -n "$DRY_RUN" ]; then
        python scripts/reddit_poster.py $DRY_RUN > "$LOG_DIR/reddit_run.log" 2>&1 &
    else
        python scripts/reddit_poster.py --go > "$LOG_DIR/reddit_run.log" 2>&1 &
    fi
    REDDIT_PID=$!
    PIDS+=($REDDIT_PID)
    echo "  PID: $REDDIT_PID (log: $LOG_DIR/reddit_run.log)"
fi

# --- Twitter ---
if $TWITTER; then
    echo "[TWITTER] Launching Twitter poster..."
    if [ -n "$DRY_RUN" ]; then
        python scripts/twitter_poster.py $DRY_RUN > "$LOG_DIR/twitter_run.log" 2>&1 &
    else
        python scripts/twitter_poster.py --go > "$LOG_DIR/twitter_run.log" 2>&1 &
    fi
    TWITTER_PID=$!
    PIDS+=($TWITTER_PID)
    echo "  PID: $TWITTER_PID (log: $LOG_DIR/twitter_run.log)"
fi

echo ""
echo "============================================"
echo "  All platforms launched (${#PIDS[@]} processes)"
echo "============================================"
echo ""
echo "  Monitor logs:"
if $FB; then echo "    tail -f $LOG_DIR/fb_run.log"; fi
if $REDDIT; then echo "    tail -f $LOG_DIR/reddit_run.log"; fi
if $TWITTER; then echo "    tail -f $LOG_DIR/twitter_run.log"; fi
echo ""
echo "  Or watch all at once:"
echo "    tail -f $LOG_DIR/*_run.log"
echo ""

# Wait for all background processes
FAILED=0
for pid in "${PIDS[@]}"; do
    if ! wait "$pid"; then
        FAILED=$((FAILED + 1))
    fi
done

echo ""
echo "============================================"
echo "  ORDER 66 COMPLETE"
echo "============================================"

# Print summary from logs
if $FB && [ -f "$LOG_DIR/fb_run.log" ]; then
    echo ""
    echo "--- Facebook ---"
    tail -5 "$LOG_DIR/fb_run.log"
fi
if $REDDIT && [ -f "$LOG_DIR/reddit_run.log" ]; then
    echo ""
    echo "--- Reddit ---"
    tail -5 "$LOG_DIR/reddit_run.log"
fi
if $TWITTER && [ -f "$LOG_DIR/twitter_run.log" ]; then
    echo ""
    echo "--- Twitter ---"
    tail -5 "$LOG_DIR/twitter_run.log"
fi

echo ""
if [ $FAILED -eq 0 ]; then
    echo "All platforms completed successfully."
else
    echo "$FAILED platform(s) had errors. Check logs above."
fi
