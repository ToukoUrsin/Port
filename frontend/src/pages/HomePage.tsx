import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Clock, ImageIcon, ChevronDown, MapPin, X } from "lucide-react";
import Navbar from "@/components/Navbar";
import BottomBar from "@/components/BottomBar";
import { ARTICLES, BADGE_CLASS, authorSlug, type Article } from "@/data/articles";
import "./HomePage.css";

const RECENT_ARTICLES = ARTICLES.filter((a) =>
  ["2 hours ago", "4 hours ago", "5 hours ago", "8 hours ago", "10 hours ago", "12 hours ago"].includes(a.timeAgo)
);
const BEST_OF_WEEK = [...ARTICLES]
  .filter((a) => a.image)
  .sort((a, b) => (b.qualityScore ?? 0) - (a.qualityScore ?? 0))
  .slice(0, 5);
const OPINION_ARTICLES = ARTICLES.filter((a) => a.category === "opinion");
const EVENT_ARTICLES = ARTICLES.filter((a) => a.category === "events");
const NEWS_HEADLINES = ARTICLES.filter((a) =>
  ["council", "news", "community"].includes(a.category) && !a.image
);
const NEWS_WITH_IMAGES = ARTICLES.filter((a) =>
  ["council", "news", "community"].includes(a.category) && !!a.image
);

const RADIUS_OPTIONS = [5, 10, 25, 50, 100];

const LOCATION_SUGGESTIONS = [
  "City Hall, Main Street",
  "Central Park",
  "Downtown District",
  "Riverside Community Center",
  "Elm Street Elementary School",
  "Lincoln High School",
  "Public Library, Oak Avenue",
  "Farmers Market, Town Square",
  "Fire Station #3, Cedar Road",
  "Memorial Hospital",
  "Lakewood Shopping Center",
  "Maple Street Playground",
  "Westside Sports Complex",
  "Heritage Museum, Bridge Street",
  "Police Station, 5th Avenue",
];

function LocationSuggestInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const [isFocused, setIsFocused] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const filtered = value.trim()
    ? LOCATION_SUGGESTIONS.filter((s) =>
        s.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 5)
    : LOCATION_SUGGESTIONS.slice(0, 5);

  const showDropdown = isFocused && filtered.length > 0;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="loc-location-wrapper" ref={wrapperRef}>
      <input
        id="loc-input"
        placeholder="Enter your city or address"
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        autoComplete="off"
      />
      {showDropdown && (
        <ul className="loc-location-dropdown">
          {filtered.map((suggestion) => (
            <li key={suggestion}>
              <button
                type="button"
                className="loc-location-option"
                onMouseDown={() => {
                  onChange(suggestion);
                  setIsFocused(false);
                }}
              >
                {suggestion}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RadiusSuggestInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (val: number) => void;
}) {
  const [isFocused, setIsFocused] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="loc-location-wrapper" ref={wrapperRef}>
      <input
        id="loc-radius"
        readOnly
        value={`${value} km`}
        className="input"
        onFocus={() => setIsFocused(true)}
      />
      {isFocused && (
        <ul className="loc-location-dropdown">
          {RADIUS_OPTIONS.map((km) => (
            <li key={km}>
              <button
                type="button"
                className={`loc-location-option ${km === value ? "loc-location-option--active" : ""}`}
                onMouseDown={() => {
                  onChange(km);
                  setIsFocused(false);
                }}
              >
                {km} km
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function LocationModal({
  open,
  location,
  radius,
  onLocationChange,
  onRadiusChange,
  onClose,
}: {
  open: boolean;
  location: string;
  radius: number;
  onLocationChange: (v: string) => void;
  onRadiusChange: (v: number) => void;
  onClose: () => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [open]);

  if (!open) return null;

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 250);
  };

  return (
    <div className={`loc-overlay ${visible ? "loc-overlay--visible" : ""}`} onClick={handleClose}>
      <div className={`loc-modal ${visible ? "loc-modal--visible" : ""}`} onClick={(e) => e.stopPropagation()}>
        <button className="loc-modal__close" onClick={handleClose}>
          <X size={18} />
        </button>
        <h2 className="loc-modal__title">Set your location</h2>
        <p className="loc-modal__desc">Get news from your area</p>

        <div className="loc-modal__fields">
          <div className="loc-modal__field">
            <label htmlFor="loc-input">Location</label>
            <LocationSuggestInput value={location} onChange={onLocationChange} />
          </div>
          <div className="loc-modal__field">
            <label htmlFor="loc-radius">Radius</label>
            <RadiusSuggestInput value={radius} onChange={onRadiusChange} />
          </div>
        </div>

        <button className="btn btn-primary loc-modal__confirm" onClick={handleClose}>
          Show local news
        </button>
      </div>
    </div>
  );
}

/* ========================================
   CARD VARIANTS
   ======================================== */

function ArticleCard({ article, featured }: { article: Article; featured?: boolean }) {
  return (
    <Link
      to={`/article/${article.id}`}
      className={`card article-card ${article.isLead ? "article-card--lead" : ""} ${featured ? "article-card--featured" : ""}`}
      style={{ textDecoration: "none", color: "inherit" }}
    >
      <div className="article-card__img">
        {article.image ? (
          <img src={article.image} alt={article.title} />
        ) : (
          <div className="article-card__img-placeholder">
            <ImageIcon size={32} />
          </div>
        )}
      </div>
      <div className="article-card__body">
        <div className="article-card__meta">
          <span className={`badge ${BADGE_CLASS[article.category]}`}>
            {article.category}
          </span>
        </div>
        <h2 className="article-card__title">{article.title}</h2>
        <p className="article-card__excerpt">{article.excerpt}</p>
        <div className="article-card__footer">
          <Link
            to={`/profile/${authorSlug(article.author)}`}
            className="article-card__author-link"
            onClick={(e) => e.stopPropagation()}
          >
            {article.author}
          </Link>
          <span>&middot;</span>
          <Clock size={12} />
          <span>{article.timeAgo}</span>
        </div>
      </div>
    </Link>
  );
}

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
        <h3 className="ranked-card__title">{article.title}</h3>
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
        <span className={`badge ${BADGE_CLASS[article.category]}`}>
          {article.category}
        </span>
        <h2 className="opinion-card__title">{article.title}</h2>
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
        <span className={`badge ${BADGE_CLASS[article.category]}`}>
          {article.category}
        </span>
        <h3 className="event-card__title">{article.title}</h3>
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
        <span className={`badge ${BADGE_CLASS[article.category]}`}>
          {article.category}
        </span>
        <h3 className="headline-item__title">{article.title}</h3>
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
  const [location, setLocation] = useState("");
  const [radius, setRadius] = useState(25);
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <Navbar
        left={
          <button
            className="home-nav__icon-btn"
            onClick={() => setModalOpen(true)}
            title={location ? `${location} · ${radius} km` : "Set location"}
          >
            <MapPin size={18} />
          </button>
        }
      />

      <LocationModal
        open={modalOpen}
        location={location}
        radius={radius}
        onLocationChange={setLocation}
        onRadiusChange={setRadius}
        onClose={() => setModalOpen(false)}
      />

      <main className="home-container">
        <RecentSection articles={RECENT_ARTICLES} />
        <BestOfWeekSection articles={BEST_OF_WEEK} />
        <OpinionSection articles={OPINION_ARTICLES} />
        <EventsSection articles={EVENT_ARTICLES} />
        <NewsSection headlines={NEWS_HEADLINES} featured={NEWS_WITH_IMAGES} />
      </main>
      <div className="home-fade-bottom" />
      <BottomBar />
    </>
  );
}
