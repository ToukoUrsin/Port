import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Clock, ImageIcon, ChevronDown, MapPin, Loader2 } from "lucide-react";
import Onboarding, { shouldShowOnboarding } from "@/components/Onboarding";
import Navbar from "@/components/Navbar";
import BottomBar from "@/components/BottomBar";
import Footer from "@/components/Footer";
import ArticleCard from "@/components/ArticleCard";
import FilterChips from "@/components/FilterChips";
import type { FilterChip } from "@/components/FilterChips";
import { useApi } from "@/hooks/useApi.ts";
import { getArticles, getLocations, getLocation } from "@/lib/api.ts";
import { apiToArticle } from "@/lib/types.ts";
import type { ArticleListResponse, ApiLocation } from "@/lib/types.ts";
import { useLanguage } from "@/contexts/LanguageContext";
import { BADGE_CLASS, type Article } from "@/data/articles";
import { getSavedLocationIds, getSavedLocationNames } from "@/pages/ExplorePage";
import "./HomePage.css";

const ALL_CATEGORIES = ["council", "schools", "business", "events", "sports", "community", "opinion", "news"];

/* ========================================
   CARD VARIANTS
   ======================================== */

function RankedCard({ article, rank }: { article: Article; rank: number }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  return (
    <Link
      to={`/article/${article.id}`}
      className="ranked-card"
      style={{ textDecoration: "none", color: "inherit" }}
    >
      <span className="ranked-card__rank">{rank}</span>
      <div className="ranked-card__thumb">
        {article.image ? (
          <img src={article.image} alt={article.title} />
        ) : (
          <div className="ranked-card__thumb-placeholder">
            <ImageIcon size={16} />
          </div>
        )}
      </div>
      <div className="ranked-card__body">
        <div className="ranked-card__meta">
          <span
            className={`badge badge--clickable ${BADGE_CLASS[article.category]}`}
            role="link"
            tabIndex={0}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              navigate(`/tag/${article.category}`);
            }}
          >
            {t("tag." + article.category)}
          </span>
        </div>
        <h3 className="ranked-card__title">
          {article.title}
        </h3>
        <div className="ranked-card__footer">
          <span>{article.author}</span>
          <span>&middot;</span>
          <Clock size={11} />
          <span>{article.timeAgo}</span>
        </div>
      </div>
    </Link>
  );
}

function TrendingCard({ article }: { article: Article }) {
  const { t } = useLanguage();
  return (
    <Link
      to={`/article/${article.id}`}
      className="trending-card"
      style={{ textDecoration: "none", color: "inherit" }}
    >
      {article.image && (
        <div className="trending-card__thumb">
          <img src={article.image} alt={article.title} />
        </div>
      )}
      <div className="trending-card__body">
        <span className={`badge ${BADGE_CLASS[article.category]}`}>
          {t("tag." + article.category)}
        </span>
        <h3 className="trending-card__title">{article.title}</h3>
        <div className="trending-card__meta">
          {article.area && (
            <>
              <MapPin size={11} />
              <span>{article.area}</span>
              <span>&middot;</span>
            </>
          )}
          <Clock size={11} />
          <span>{article.timeAgo}</span>
        </div>
      </div>
    </Link>
  );
}

function OpinionCard({ article }: { article: Article }) {
  const { t } = useLanguage();
  return (
    <Link
      to={`/article/${article.id}`}
      className="card opinion-card"
      style={{ textDecoration: "none", color: "inherit" }}
    >
      <div className="opinion-card__body">
        <h2 className="opinion-card__title">
          <span className="title-prefix">{t("tag." + article.category)}</span>
          <span className="title-sep"> | </span>
          {article.title}
        </h2>
        <p className="opinion-card__excerpt">{article.excerpt}</p>
        <div className="opinion-card__author">
          <div className="opinion-card__avatar">
            {(article.author ?? "?").split(" ").map(n => n[0]).join("")}
          </div>
          <div>
            <span className="opinion-card__name">{article.author ?? t("home.anonymous")}</span>
            <span className="opinion-card__time">{article.timeAgo}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function EventCard({ article }: { article: Article }) {
  const { t } = useLanguage();
  return (
    <Link
      to={`/article/${article.id}`}
      className="card event-card"
      style={{ textDecoration: "none", color: "inherit" }}
    >
      {article.image && (
        <div className="event-card__img">
          <img src={article.image} alt={article.title} />
        </div>
      )}
      <div className="event-card__body">
        <h3 className="event-card__title">
          <span className="title-prefix">{t("tag." + article.category)}</span>
          <span className="title-sep"> | </span>
          {article.title}
        </h3>
        <p className="event-card__excerpt">{article.excerpt}</p>
        <div className="event-card__footer">
          <MapPin size={12} />
          <span>{article.area}</span>
          <span>&middot;</span>
          <Clock size={12} />
          <span>{article.timeAgo}</span>
        </div>
      </div>
    </Link>
  );
}

function HeadlineItem({ article }: { article: Article }) {
  const { t } = useLanguage();
  return (
    <Link
      to={`/article/${article.id}`}
      className="headline-item"
      style={{ textDecoration: "none", color: "inherit" }}
    >
      <div className="headline-item__content">
        <h3 className="headline-item__title">
          <span className="title-prefix">{t("tag." + article.category)}</span>
          <span className="title-sep"> | </span>
          {article.title}
        </h3>
        <p className="headline-item__excerpt">{article.excerpt}</p>
      </div>
      <div className="headline-item__meta">
        <span>{article.author}</span>
        <span>&middot;</span>
        <Clock size={11} />
        <span>{article.timeAgo}</span>
      </div>
    </Link>
  );
}

/* ========================================
   AD BANNER
   ======================================== */

const ADS = [
  { image: "/Ad1.png", url: "https://westmac.fi" },
  { image: "/Ad 2.png", url: "https://www.movaroo.fi/etusivu" },
  { image: "/Ad 3.png", url: "https://isku.app" },
  { image: "/Ad 4.png", url: "https://www.mesembria.fi" },
];

function AdBanner({ t }: { t: (key: string) => string }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % ADS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="ad-banner">
      <a
        href={ADS[current].url}
        target="_blank"
        rel="noopener noreferrer"
        className="ad-banner__inner"
      >
        <span className="ad-banner__label">{t("home.ad")}</span>
        <img src={ADS[current].image} alt={t("home.advertisement")} />
      </a>
    </section>
  );
}

/* ========================================
   SECTION LAYOUTS
   ======================================== */

const INITIAL_COUNT = 2;

function RecentSection({ articles, t }: { articles: Article[]; t: (key: string) => string }) {
  const [expanded, setExpanded] = useState(false);
  const lead = articles[0];
  const rest = articles.slice(1);
  const visible = expanded ? rest : rest.slice(0, INITIAL_COUNT);
  const hasMore = rest.length > INITIAL_COUNT;

  return (
    <section className="home-section">
      <h2 className="home-section__title">{t("home.recent")}</h2>
      <div className="article-grid">
        {lead && <ArticleCard article={{ ...lead, isLead: true }} />}
        {lead && visible.length > 0 && <hr className="home-divider" />}
        {visible.map((article, i) => (
          <ArticleCard key={article.id} article={article} featured={i === 0} />
        ))}
      </div>
      {hasMore && !expanded && (
        <div className="home-section__more">
          <button className="home-show-more" onClick={() => setExpanded(true)}>
            {t("home.showMore")}
            <ChevronDown size={16} />
          </button>
        </div>
      )}
    </section>
  );
}

function BestOfWeekSection({ articles, t }: { articles: Article[]; t: (key: string) => string }) {
  if (articles.length === 0) return null;
  return (
    <section className="home-section">
      <h2 className="home-section__title">{t("home.bestOfWeek")}</h2>
      <div className="ranked-list">
        {articles.map((article, i) => (
          <RankedCard key={article.id} article={article} rank={i + 1} />
        ))}
      </div>
    </section>
  );
}

function TrendingSection({ articles, t }: { articles: Article[]; t: (key: string) => string }) {
  if (articles.length === 0) return null;
  return (
    <section className="home-section">
      <div className="home-section__header">
        <h2 className="home-section__title">{t("home.trending")}</h2>
      </div>
      <div className="trending-list">
        {articles.map((article) => (
          <TrendingCard key={article.id} article={article} />
        ))}
      </div>
    </section>
  );
}

function OpinionSection({ articles, t }: { articles: Article[]; t: (key: string) => string }) {
  if (articles.length === 0) return null;
  return (
    <section className="home-section">
      <h2 className="home-section__title">{t("home.opinions")}</h2>
      <div className="opinion-grid">
        {articles.map((article) => (
          <OpinionCard key={article.id} article={article} />
        ))}
      </div>
    </section>
  );
}

function EventsSection({ articles, t }: { articles: Article[]; t: (key: string) => string }) {
  if (articles.length === 0) return null;
  return (
    <section className="home-section">
      <h2 className="home-section__title">{t("home.events")}</h2>
      <div className="events-grid">
        {articles.map((article) => (
          <EventCard key={article.id} article={article} />
        ))}
      </div>
    </section>
  );
}

function NewsSection({
  headlines,
  featured,
  t,
}: {
  headlines: Article[];
  featured: Article[];
  t: (key: string) => string;
}) {
  if (headlines.length === 0 && featured.length === 0) return null;
  return (
    <section className="home-section">
      <h2 className="home-section__title">{t("home.news")}</h2>
      <div className="news-layout">
        <div className="news-layout__headlines">
          {headlines.map((article) => (
            <HeadlineItem key={article.id} article={article} />
          ))}
        </div>
        {featured.length > 0 && (
          <div className="news-layout__featured">
            {featured.slice(0, 8).map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function MoreStoriesSection({
  articles,
  hasMore,
  isLoadingMore,
  sentinelRef,
  t,
}: {
  articles: Article[];
  hasMore: boolean;
  isLoadingMore: boolean;
  sentinelRef: React.RefObject<HTMLDivElement | null>;
  t: (key: string) => string;
}) {
  if (articles.length === 0 && !hasMore) return null;

  return (
    <section className="home-section">
      <h2 className="home-section__title">{t("home.moreStories")}</h2>
      <div className="article-grid">
        {articles.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>
      <div ref={sentinelRef} className="scroll-sentinel" />
      {isLoadingMore && (
        <div className="more-stories__status">
          <Loader2 size={16} className="animate-spin" />
          <span>{t("search.loading")}</span>
        </div>
      )}
      {!hasMore && articles.length > 0 && (
        <div className="more-stories__status">
          <span>{t("home.allLoaded")}</span>
        </div>
      )}
    </section>
  );
}

export default function HomePage() {
  const [searchParams] = useSearchParams();
  const { language, setLanguage, t } = useLanguage();
  const locationSlug = searchParams.get("location");

  // --- Shared link handling ---
  // Track the shared location separately so it doesn't pollute localStorage.
  // null = no shared link, undefined = resolving, ApiLocation = resolved
  const [sharedLoc, setSharedLoc] = useState<ApiLocation | null | undefined>(
    locationSlug ? undefined : null,
  );
  const langDetected = useRef(false);
  useEffect(() => {
    if (!locationSlug || langDetected.current) return;
    langDetected.current = true;
    getLocation(locationSlug).then((loc) => {
      const path = loc.path.toLowerCase();
      if (path.includes("finland") && language !== "fi") {
        setLanguage("fi");
      } else if (path.includes("united-states") && language !== "en") {
        setLanguage("en");
      }
      setSharedLoc(loc);
    }).catch(() => { setSharedLoc(null); });
  }, [locationSlug, language, setLanguage]);

  // Fetch locations from API, filtered by language/country
  const country = language === "fi" ? "finland" : "united-states";
  const fetchLocations = useCallback(() => getLocations({ country, level: [3], min_articles: 1 }), [country]);
  const { data: locData } = useApi<{ locations: ApiLocation[] }>(fetchLocations, [country]);
  const allLocations = useMemo(
    () => (locData?.locations ?? []).sort((a, b) => a.name.localeCompare(b.name)),
    [locData],
  );

  // Geolocation: get user position for nearby cities
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const geoAttempted = useRef(false);
  useEffect(() => {
    if (geoAttempted.current) return;
    geoAttempted.current = true;
    navigator.geolocation?.getCurrentPosition(
      (pos) => setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { timeout: 5000 },
    );
  }, []);

  // 5 nearest cities (with lat/lng), fallback to first 5 alphabetically
  const nearbyCities = useMemo(() => {
    const withCoords = allLocations.filter((l) => l.lat != null && l.lng != null);
    if (userPos && withCoords.length > 0) {
      const sorted = [...withCoords].sort((a, b) => {
        const da = (a.lat! - userPos.lat) ** 2 + (a.lng! - userPos.lng) ** 2;
        const db = (b.lat! - userPos.lat) ** 2 + (b.lng! - userPos.lng) ** 2;
        return da - db;
      });
      return sorted.slice(0, 5);
    }
    return allLocations.slice(0, 5);
  }, [allLocations, userPos]);

  // Selected location IDs — from city bar toggles + explore map
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(getSavedLocationIds()));

  // Sync to localStorage when selectedIds changes (but NOT the shared link location)
  useEffect(() => {
    localStorage.setItem("selected_locations", JSON.stringify(Array.from(selectedIds)));
  }, [selectedIds]);

  // Filter panel state
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem("selected_categories") || "[]")); }
    catch { return new Set(); }
  });

  useEffect(() => {
    localStorage.setItem("selected_categories", JSON.stringify([...selectedCategories]));
  }, [selectedCategories]);

  function toggleCity(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // When viewing via shared link, filter to that town only
  const isSharedLink = sharedLoc !== null;
  const isAllSelected = !isSharedLink && selectedIds.size === 0;

  function selectAll() {
    setSharedLoc(null); // clear shared link filter when user taps "All"
    setSelectedIds(new Set());
    setSelectedCategories(new Set());
  }

  // Merge selected IDs + shared location for article fetching
  const effectiveIds = useMemo(() => {
    const ids = Array.from(selectedIds);
    if (sharedLoc) ids.push(sharedLoc.id);
    return ids;
  }, [selectedIds, sharedLoc]);

  // Fetch articles filtered by selected locations
  const fetchArticles = useCallback(
    () => {
      // Still resolving shared link — don't fetch yet
      if (sharedLoc === undefined) {
        return Promise.resolve({ articles: [], total: 0 } as ArticleListResponse);
      }
      if (effectiveIds.length > 0) {
        return getArticles({ limit: 30, location_ids: effectiveIds, sort: "ranked" });
      }
      return getArticles({ limit: 30, country, sort: "ranked" });
    },
    [effectiveIds, country, sharedLoc],
  );
  const isResolvingSharedLink = sharedLoc === undefined;
  const { data: apiData, isLoading: isLoadingArticles, error } = useApi<ArticleListResponse>(fetchArticles, [effectiveIds, country, sharedLoc]);
  const isLoading = isResolvingSharedLink || isLoadingArticles;
  const allArticles = useMemo(
    () => (apiData?.articles ?? []).map((a) => apiToArticle(a, t)),
    [apiData, t],
  );

  // Fetch global trending articles (no country/location filter)
  const fetchTrending = useCallback(
    () => getArticles({ limit: 10, sort: "ranked" }),
    [],
  );
  const { data: trendingData } = useApi<ArticleListResponse>(fetchTrending, []);
  const trendingArticles = useMemo(
    () => (trendingData?.articles ?? []).map((a) => apiToArticle(a, t)).slice(0, 5),
    [trendingData, t],
  );

  // --- Infinite scroll state ---
  const [moreArticles, setMoreArticles] = useState<Article[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  // Capture cursor from initial fetch & reset on filter change
  useEffect(() => {
    setNextCursor(apiData?.next_cursor ?? null);
    setHasMore(apiData?.has_more ?? false);
    setMoreArticles([]);
  }, [apiData]);

  // Deduplication set: IDs already shown in curated sections + trending
  const initialIdSet = useMemo(() => {
    const ids = new Set<string>();
    for (const a of allArticles) ids.add(a.id);
    for (const a of trendingArticles) ids.add(a.id);
    return ids;
  }, [allArticles, trendingArticles]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || !nextCursor) return;
    setIsLoadingMore(true);
    try {
      const params: Parameters<typeof getArticles>[0] = {
        limit: 20,
        cursor: nextCursor,
        sort: "ranked",
        country: effectiveIds.length > 0 ? undefined : country,
      };
      if (effectiveIds.length > 0) {
        params.location_ids = effectiveIds;
      }
      const res = await getArticles(params);
      const newArticles = res.articles
        .map((a) => apiToArticle(a, t))
        .filter((a) => !initialIdSet.has(a.id));
      // Also deduplicate against already-loaded more articles
      const existingMore = new Set(moreArticles.map((a) => a.id));
      const unique = newArticles.filter((a) => !existingMore.has(a.id));
      setMoreArticles((prev) => [...prev, ...unique]);
      setNextCursor(res.next_cursor ?? null);
      setHasMore(res.has_more ?? false);
    } catch {
      // Silently fail — user can retry by scrolling
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, nextCursor, effectiveIds, country, t, initialIdSet, moreArticles]);

  // IntersectionObserver for infinite scroll
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMore(); },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  // Category counts (from fetched articles, before category filtering)
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of allArticles) counts[a.category] = (counts[a.category] || 0) + 1;
    return counts;
  }, [allArticles]);

  // Filtered articles (category filter applied client-side)
  const filteredArticles = useMemo(() => {
    if (selectedCategories.size === 0) return allArticles;
    return allArticles.filter(a => selectedCategories.has(a.category));
  }, [allArticles, selectedCategories]);

  const filteredTrending = useMemo(() => {
    if (selectedCategories.size === 0) return trendingArticles;
    return trendingArticles.filter(a => selectedCategories.has(a.category));
  }, [trendingArticles, selectedCategories]);

  // Filter more articles by selected categories
  const filteredMore = useMemo(() => {
    if (selectedCategories.size === 0) return moreArticles;
    return moreArticles.filter(a => selectedCategories.has(a.category));
  }, [moreArticles, selectedCategories]);

  // Saved location names from explore map picks
  const savedNames = useMemo(() => getSavedLocationNames(), []);

  // Build filter chips
  const nearbyIdSet = useMemo(() => new Set(nearbyCities.map((l) => l.id)), [nearbyCities]);
  const filterChips = useMemo(() => {
    const chips: FilterChip[] = [];
    // Show shared link location as a chip
    if (sharedLoc) {
      chips.push({ type: "location", id: sharedLoc.id, label: sharedLoc.name });
    }
    for (const locId of selectedIds) {
      if (sharedLoc && locId === sharedLoc.id) continue; // avoid duplicate
      if (nearbyIdSet.has(locId)) continue; // nearby cities shown in bar
      const loc = allLocations.find((l) => l.id === locId);
      const name = loc?.name ?? savedNames[locId];
      if (name) {
        chips.push({ type: "location", id: locId, label: name });
      }
    }
    // Category chips
    for (const cat of selectedCategories) {
      chips.push({ type: "category", id: cat, label: t("tag." + cat) });
    }
    return chips;
  }, [selectedIds, allLocations, nearbyIdSet, sharedLoc, savedNames, selectedCategories, t]);

  const handleRemoveChip = useCallback((chip: FilterChip) => {
    if (chip.type === "category") {
      setSelectedCategories((prev) => {
        const next = new Set(prev);
        next.delete(chip.id);
        return next;
      });
      return;
    }
    // If removing the shared link chip, clear it
    if (sharedLoc && chip.id === sharedLoc.id) {
      setSharedLoc(null);
      return;
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(chip.id);
      return next;
    });
  }, [sharedLoc]);

  const handleClearAll = useCallback(() => {
    setSharedLoc(null);
    setSelectedIds(new Set());
    setSelectedCategories(new Set());
  }, []);

  // Deduplicate: each article appears in at most one section
  const { recentArticles, trendingDeduped, bestOfWeek, opinionArticles, eventArticles, newsHeadlines, newsFeatured } = useMemo(() => {
    const used = new Set<string>();

    // 1. Recent gets first pick: top 10 from ranked feed
    const recent: Article[] = [];
    for (const a of filteredArticles) {
      if (recent.length >= 10) break;
      if (!used.has(a.id)) {
        recent.push(a);
        used.add(a.id);
      }
    }

    // 2. Trending: deduplicated against recent
    const trendingDd = filteredTrending.filter((a) => !used.has(a.id));
    for (const a of filteredTrending) used.add(a.id);

    // 3. Best of Week: image articles from last 7 days, excluding used
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const bow: Article[] = [];
    for (const a of filteredArticles) {
      if (bow.length >= 5) break;
      if (!used.has(a.id) && a.image && a.createdAt && new Date(a.createdAt).getTime() > weekAgo) {
        bow.push(a);
        used.add(a.id);
      }
    }

    // 4. Category sections: only unused articles
    const opinions = filteredArticles.filter((a) => !used.has(a.id) && a.category === "opinion");
    opinions.forEach((a) => used.add(a.id));

    const events = filteredArticles.filter((a) => !used.has(a.id) && a.category === "events");
    events.forEach((a) => used.add(a.id));

    const newsCategories = ["council", "news", "community"];
    const headlines = filteredArticles.filter((a) => !used.has(a.id) && newsCategories.includes(a.category) && !a.image);
    const featured = filteredArticles.filter((a) => !used.has(a.id) && newsCategories.includes(a.category) && !!a.image);

    return { recentArticles: recent, trendingDeduped: trendingDd, bestOfWeek: bow, opinionArticles: opinions, eventArticles: events, newsHeadlines: headlines, newsFeatured: featured };
  }, [filteredArticles, filteredTrending]);

  // Skip onboarding when arriving via shared town link
  const [showOnboarding, setShowOnboarding] = useState(() =>
    locationSlug ? false : shouldShowOnboarding()
  );

  return (
    <>
      {showOnboarding && <Onboarding onComplete={() => setShowOnboarding(false)} />}
      <Navbar />
      <nav className="city-bar">
        <div className="city-bar__inner">
          <div className="city-bar__scroll">
            <button
              className={`city-bar__item ${isAllSelected ? "city-bar__item--active" : ""}`}
              onClick={selectAll}
            >
              {t("home.all")}
            </button>
            {nearbyCities.map((loc) => {
              const isActive = selectedIds.has(loc.id) || (sharedLoc?.id === loc.id);
              return (
                <button
                  key={loc.id}
                  className={`city-bar__item ${isActive ? "city-bar__item--active" : ""}`}
                  onClick={() => toggleCity(loc.id)}
                >
                  {loc.name}
                </button>
              );
            })}
          </div>
          <button
            className={`city-bar__toggle ${filterPanelOpen ? "city-bar__toggle--active" : ""}`}
            onClick={() => setFilterPanelOpen((p) => !p)}
            aria-expanded={filterPanelOpen}
            aria-label={t("filter.categories")}
          >
            <ChevronDown size={16} style={{ transform: filterPanelOpen ? "rotate(180deg)" : undefined }} />
          </button>
        </div>
        {filterPanelOpen && (
          <div className="filter-panel">
            {ALL_CATEGORIES.some((cat) => (categoryCounts[cat] ?? 0) > 0) && (
              <div>
                <div className="filter-panel__label">{t("filter.categories")}</div>
                <div className="filter-panel__items" style={{ marginTop: "var(--space-2)" }}>
                  {ALL_CATEGORIES.filter((cat) => (categoryCounts[cat] ?? 0) > 0).map((cat) => (
                    <button
                      key={cat}
                      className={`badge ${BADGE_CLASS[cat] ?? ""} badge--clickable ${selectedCategories.has(cat) ? "badge--active" : ""}`}
                      onClick={() =>
                        setSelectedCategories((prev) => {
                          const next = new Set(prev);
                          if (next.has(cat)) next.delete(cat);
                          else next.add(cat);
                          return next;
                        })
                      }
                    >
                      {t("tag." + cat)}
                      <span className="filter-panel__count">{categoryCounts[cat]}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {allLocations.filter((loc) => !nearbyIdSet.has(loc.id)).length > 0 && (
              <div>
                <div className="filter-panel__label">{t("filter.moreCities")}</div>
                <div className="filter-panel__items" style={{ marginTop: "var(--space-2)" }}>
                  {allLocations
                    .filter((loc) => !nearbyIdSet.has(loc.id))
                    .map((loc) => (
                      <button
                        key={loc.id}
                        className={`filter-panel__city ${selectedIds.has(loc.id) ? "filter-panel__city--active" : ""}`}
                        onClick={() => toggleCity(loc.id)}
                      >
                        {loc.name}
                        {loc.article_count != null && (
                          <span className="filter-panel__count">({loc.article_count})</span>
                        )}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </nav>
      <FilterChips chips={filterChips} onRemove={handleRemoveChip} onClearAll={handleClearAll} />

      <main className="home-container">
        {isLoading ? (
          <div style={{ textAlign: "center", padding: "var(--space-16)", color: "var(--color-text-tertiary)" }}>
            <Loader2 size={32} className="animate-spin" />
          </div>
        ) : error ? (
          <div style={{ textAlign: "center", padding: "var(--space-16)", color: "var(--color-text-secondary)" }}>
            <p>{t("home.loadError")}</p>
          </div>
        ) : allArticles.length === 0 ? (
          <div style={{ textAlign: "center", padding: "var(--space-16)", color: "var(--color-text-secondary)" }}>
            <p>{t("home.noArticles")}</p>
          </div>
        ) : filteredArticles.length === 0 && selectedCategories.size > 0 ? (
          <div style={{ textAlign: "center", padding: "var(--space-16)", color: "var(--color-text-secondary)" }}>
            <p>{t("home.noFilterResults")}</p>
          </div>
        ) : (
          <>
            <RecentSection articles={recentArticles} t={t} />
            <img src="/Line 1.svg" alt="" className="line-divider" />
            <AdBanner t={t} />
            {trendingDeduped.length > 0 && (
              <>
                <img src="/Line 1.svg" alt="" className="line-divider" />
                <TrendingSection articles={trendingDeduped} t={t} />
              </>
            )}
            {bestOfWeek.length > 0 && (
              <>
                <img src="/Line 1.svg" alt="" className="line-divider" />
                <BestOfWeekSection articles={bestOfWeek} t={t} />
              </>
            )}
            {opinionArticles.length > 0 && (
              <>
                <img src="/Line 1.svg" alt="" className="line-divider" />
                <OpinionSection articles={opinionArticles} t={t} />
              </>
            )}
            <img src="/Line 1.svg" alt="" className="line-divider" />
            <AdBanner t={t} />
            {eventArticles.length > 0 && (
              <>
                <img src="/Line 1.svg" alt="" className="line-divider" />
                <EventsSection articles={eventArticles} t={t} />
              </>
            )}
            {(newsHeadlines.length > 0 || newsFeatured.length > 0) && (
              <>
                <img src="/Line 1.svg" alt="" className="line-divider" />
                <NewsSection headlines={newsHeadlines} featured={newsFeatured} t={t} />
              </>
            )}
            {(filteredMore.length > 0 || hasMore) && (
              <>
                <img src="/Line 1.svg" alt="" className="line-divider" />
                <MoreStoriesSection
                  articles={filteredMore}
                  hasMore={hasMore}
                  isLoadingMore={isLoadingMore}
                  sentinelRef={sentinelRef}
                  t={t}
                />
              </>
            )}
          </>
        )}
      </main>
      <Footer />
      <div className="home-fade-bottom" />
      <BottomBar />
    </>
  );
}
