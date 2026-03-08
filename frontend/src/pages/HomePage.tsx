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
import { getSavedLocationIds } from "@/pages/ExplorePage";
import "./HomePage.css";


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
            {featured.slice(0, 2).map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        )}
      </div>
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
  const fetchLocations = useCallback(() => getLocations({ country, level: [3] }), [country]);
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
        return getArticles({ limit: 100, location_ids: effectiveIds });
      }
      return getArticles({ limit: 100, country });
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
      const loc = allLocations.find((l) => l.id === locId);
      if (loc && !nearbyIdSet.has(locId)) {
        chips.push({ type: "location", id: loc.id, label: loc.name });
      }
    }
    return chips;
  }, [selectedIds, allLocations, nearbyIdSet, sharedLoc]);

  const handleRemoveChip = useCallback((chip: FilterChip) => {
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
  }, []);

  const recentArticles = allArticles.slice(0, 10);
  const bestOfWeek = useMemo(
    () => [...allArticles]
      .filter((a) => a.image)
      .sort((a, b) => b.title.localeCompare(a.title))
      .slice(0, 5),
    [allArticles],
  );
  const opinionArticles = allArticles.filter((a) => a.category === "opinion");
  const eventArticles = allArticles.filter((a) => a.category === "events");
  const newsCategories = ["council", "news", "community"];
  const newsHeadlines = allArticles.filter((a) => newsCategories.includes(a.category) && !a.image);
  const newsFeatured = allArticles.filter((a) => newsCategories.includes(a.category) && !!a.image);

  // Skip onboarding when arriving via shared town link
  const [showOnboarding, setShowOnboarding] = useState(() =>
    locationSlug ? false : shouldShowOnboarding()
  );

  return (
    <>
      {showOnboarding && <Onboarding onComplete={() => setShowOnboarding(false)} />}
      <Navbar />
      <nav className="city-bar">
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
        ) : (
          <>
            <RecentSection articles={recentArticles} t={t} />
            <img src="/Line 1.svg" alt="" className="line-divider" />
            <AdBanner t={t} />
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
          </>
        )}
      </main>
      <Footer />
      <div className="home-fade-bottom" />
      <BottomBar />
    </>
  );
}
