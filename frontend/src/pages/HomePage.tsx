import { useState, useCallback, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Clock, ImageIcon, ChevronDown, MapPin, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import BottomBar from "@/components/BottomBar";
import ArticleCard from "@/components/ArticleCard";
import { useApi } from "@/hooks/useApi.ts";
import { getArticles, getLocations } from "@/lib/api.ts";
import { apiToArticle } from "@/lib/types.ts";
import type { ArticleListResponse, ApiLocation } from "@/lib/types.ts";
import { BADGE_CLASS, type Article } from "@/data/articles";
import "./HomePage.css";


/* ========================================
   CARD VARIANTS
   ======================================== */

function RankedCard({ article, rank }: { article: Article; rank: number }) {
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
          <span className={`badge ${BADGE_CLASS[article.category]}`}>
            {article.category}
          </span>
        </div>
        <h3 className="ranked-card__title">
          <span className="title-prefix">{article.category}</span>
          <span className="title-sep"> | </span>
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
  return (
    <Link
      to={`/article/${article.id}`}
      className="card opinion-card"
      style={{ textDecoration: "none", color: "inherit" }}
    >
      <div className="opinion-card__body">
        <h2 className="opinion-card__title">
          <span className="title-prefix">{article.category}</span>
          <span className="title-sep"> | </span>
          {article.title}
        </h2>
        <p className="opinion-card__excerpt">{article.excerpt}</p>
        <div className="opinion-card__author">
          <div className="opinion-card__avatar">
            {article.author.split(" ").map(n => n[0]).join("")}
          </div>
          <div>
            <span className="opinion-card__name">{article.author}</span>
            <span className="opinion-card__time">{article.timeAgo}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function EventCard({ article }: { article: Article }) {
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
          <span className="title-prefix">{article.category}</span>
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
  return (
    <Link
      to={`/article/${article.id}`}
      className="headline-item"
      style={{ textDecoration: "none", color: "inherit" }}
    >
      <div className="headline-item__content">
        <h3 className="headline-item__title">
          <span className="title-prefix">{article.category}</span>
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

const AD_IMAGES = ["/Ad1.png", "/Ad 2.png", "/Ad 3.png", "/Ad 4.png"];

function AdBanner() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % AD_IMAGES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="ad-banner">
      <div className="ad-banner__inner">
        <span className="ad-banner__label">Ad</span>
        <img src={AD_IMAGES[current]} alt="Advertisement" />
      </div>
    </section>
  );
}

/* ========================================
   SECTION LAYOUTS
   ======================================== */

const INITIAL_COUNT = 2;

function RecentSection({ articles }: { articles: Article[] }) {
  const [expanded, setExpanded] = useState(false);
  const lead = articles[0];
  const rest = articles.slice(1);
  const visible = expanded ? rest : rest.slice(0, INITIAL_COUNT);
  const hasMore = rest.length > INITIAL_COUNT;

  return (
    <section className="home-section">
      <h2 className="home-section__title">Recent</h2>
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
            Show more
            <ChevronDown size={16} />
          </button>
        </div>
      )}
    </section>
  );
}

function BestOfWeekSection({ articles }: { articles: Article[] }) {
  if (articles.length === 0) return null;
  return (
    <section className="home-section">
      <h2 className="home-section__title">Best of the Week</h2>
      <div className="ranked-list">
        {articles.map((article, i) => (
          <RankedCard key={article.id} article={article} rank={i + 1} />
        ))}
      </div>
    </section>
  );
}

function OpinionSection({ articles }: { articles: Article[] }) {
  if (articles.length === 0) return null;
  return (
    <section className="home-section">
      <h2 className="home-section__title">Opinions</h2>
      <div className="opinion-grid">
        {articles.map((article) => (
          <OpinionCard key={article.id} article={article} />
        ))}
      </div>
    </section>
  );
}

function EventsSection({ articles }: { articles: Article[] }) {
  if (articles.length === 0) return null;
  return (
    <section className="home-section">
      <h2 className="home-section__title">Events</h2>
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
}: {
  headlines: Article[];
  featured: Article[];
}) {
  if (headlines.length === 0 && featured.length === 0) return null;
  return (
    <section className="home-section">
      <h2 className="home-section__title">News</h2>
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
  const locationSlug = searchParams.get("location");

  // Fetch locations from API
  const fetchLocations = useCallback(() => getLocations(), []);
  const { data: locData } = useApi<{ locations: ApiLocation[] }>(fetchLocations, []);
  const locations = useMemo(
    () => (locData?.locations ?? [])
      .filter((l) => l.level >= 3)
      .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name)),
    [locData],
  );

  const selectedLocation = locations.find((l) => l.slug === locationSlug);

  // Fetch articles, filtered by location when one is selected
  const fetchArticles = useCallback(
    () => getArticles({ limit: 100, location_id: selectedLocation?.id }),
    [selectedLocation?.id],
  );
  const { data: apiData, isLoading, error } = useApi<ArticleListResponse>(fetchArticles, [selectedLocation?.id]);
  const allArticles = useMemo(
    () => (apiData?.articles ?? []).map(apiToArticle),
    [apiData],
  );

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

  return (
    <>
      <Navbar
        left={
          <Link to="/explore" className="home-nav__city-btn">
            <MapPin size={16} />
            <span>{selectedLocation?.name ?? "All locations"}</span>
          </Link>
        }
      />

      <nav className="city-bar">
        <div className="city-bar__scroll">
          <Link
            to="/"
            className={`city-bar__item ${!locationSlug ? "city-bar__item--active" : ""}`}
          >
            All
          </Link>
          {locations.map((loc) => {
            const isActive = loc.slug === locationSlug;
            return (
              <Link
                key={loc.id}
                to={isActive ? "/" : `/?location=${loc.slug}`}
                className={`city-bar__item ${isActive ? "city-bar__item--active" : ""}`}
              >
                {loc.name}
              </Link>
            );
          })}
        </div>
      </nav>

      <main className="home-container">
        {isLoading ? (
          <div style={{ textAlign: "center", padding: "var(--space-16)", color: "var(--color-text-tertiary)" }}>
            <Loader2 size={32} className="animate-spin" />
          </div>
        ) : error ? (
          <div style={{ textAlign: "center", padding: "var(--space-16)", color: "var(--color-text-secondary)" }}>
            <p>Failed to load articles. Please try again later.</p>
          </div>
        ) : allArticles.length === 0 ? (
          <div style={{ textAlign: "center", padding: "var(--space-16)", color: "var(--color-text-secondary)" }}>
            <p>No articles yet. Be the first to contribute!</p>
          </div>
        ) : (
          <>
            <RecentSection articles={recentArticles} />
            <AdBanner />
            <BestOfWeekSection articles={bestOfWeek} />
            <OpinionSection articles={opinionArticles} />
            <AdBanner />
            <EventsSection articles={eventArticles} />
            <NewsSection headlines={newsHeadlines} featured={newsFeatured} />
          </>
        )}
      </main>
      <div className="home-fade-bottom" />
      <BottomBar />
    </>
  );
}
