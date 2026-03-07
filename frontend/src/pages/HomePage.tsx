import { useState, useEffect, useRef } from "react";
import { NavLink } from "react-router-dom";
import { Clock, ImageIcon, ChevronDown, MapPin, X, User } from "lucide-react";
import "./HomePage.css";

interface Article {
  id: number;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  timeAgo: string;
  image: string;
  isLead?: boolean;
}

const TODAY_ARTICLES: Article[] = [
  {
    id: 1,
    title: "City Council Approves New Downtown Revitalization Plan",
    excerpt:
      "The $12M initiative aims to transform vacant lots into mixed-use spaces, with construction expected to begin this fall. Residents voiced support during Tuesday's packed public hearing.",
    category: "council",
    author: "Maria Santos",
    timeAgo: "2 hours ago",
    image: "https://images.unsplash.com/photo-1577495508048-b635879837f1?w=800&h=500&fit=crop",
    isLead: true,
  },
  {
    id: 2,
    title: "Lincoln High Robotics Team Heads to State Championship",
    excerpt:
      "After an undefeated regional season, the team will compete against 40 schools next month in Austin.",
    category: "schools",
    author: "James Liu",
    timeAgo: "4 hours ago",
    image: "https://images.unsplash.com/photo-1561557944-6e7860d1a7eb?w=600&h=400&fit=crop",
  },
  {
    id: 3,
    title: "Local Bakery Expands to Second Location on Main Street",
    excerpt:
      "Sweet Rise Bakery will open its new storefront in the former hardware store space, creating 15 new jobs.",
    category: "business",
    author: "Ana Gutierrez",
    timeAgo: "5 hours ago",
    image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&h=400&fit=crop",
  },
  {
    id: 4,
    title: "Weekend Farmers Market Adds Evening Hours for Summer",
    excerpt:
      "Starting in June, the market will stay open until 8 PM on Thursdays to accommodate working families.",
    category: "events",
    author: "Tom Bradley",
    timeAgo: "6 hours ago",
    image: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=600&h=400&fit=crop",
  },
];

const WEEK_ARTICLES: Article[] = [
  {
    id: 5,
    title: "Community Garden Project Breaks Ground in East Side Park",
    excerpt:
      "Volunteers gathered Saturday to build 40 raised beds, with plots available to residents on a first-come basis.",
    category: "community",
    author: "Priya Sharma",
    timeAgo: "2 days ago",
    image: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&h=400&fit=crop",
  },
  {
    id: 6,
    title: "High School Soccer Team Wins Regional Finals in Overtime",
    excerpt:
      "A last-minute goal from sophomore Daniela Cruz sealed the victory, sending the team to state playoffs.",
    category: "sports",
    author: "Marcus Johnson",
    timeAgo: "3 days ago",
    image: "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=600&h=400&fit=crop",
  },
  {
    id: 7,
    title: "Water Main Replacement Project Starts Next Week on Oak Avenue",
    excerpt:
      "Expect lane closures and detours for approximately six weeks as aging infrastructure is replaced.",
    category: "council",
    author: "Sarah Chen",
    timeAgo: "4 days ago",
    image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&h=400&fit=crop",
  },
  {
    id: 8,
    title: "New After-School Program Launches at Three Elementary Schools",
    excerpt:
      "The free program offers tutoring, arts, and sports activities until 6 PM for working families.",
    category: "schools",
    author: "James Liu",
    timeAgo: "5 days ago",
    image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&h=400&fit=crop",
  },
];

const BADGE_CLASS: Record<string, string> = {
  council: "badge-council",
  schools: "badge-schools",
  business: "badge-business",
  events: "badge-events",
  sports: "badge-sports",
  community: "badge-community",
};

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

const INITIAL_COUNT = 2;

function ArticleCard({ article, featured }: { article: Article; featured?: boolean }) {
  return (
    <article className={`card article-card ${article.isLead ? "article-card--lead" : ""} ${featured ? "article-card--featured" : ""}`}>
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
          <span>{article.author}</span>
          <span>&middot;</span>
          <Clock size={12} />
          <span>{article.timeAgo}</span>
        </div>
      </div>
    </article>
  );
}

function ArticleSection({
  title,
  articles,
}: {
  title: string;
  articles: Article[];
}) {
  const [expanded, setExpanded] = useState(false);
  const lead = articles.find((a) => a.isLead);
  const rest = articles.filter((a) => !a.isLead);
  const visible = expanded ? rest : rest.slice(0, INITIAL_COUNT);
  const hasMore = rest.length > INITIAL_COUNT;

  return (
    <section className="home-section">
      <h2 className="home-section__title">{title}</h2>
      <div className="article-grid">
        {lead && <ArticleCard article={lead} />}
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

export default function HomePage() {
  const [location, setLocation] = useState("");
  const [radius, setRadius] = useState(25);
  const [modalOpen, setModalOpen] = useState(true);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <>
      <nav className="home-nav">
        <div className="home-nav__left">
          <button
            className="home-nav__icon-btn"
            onClick={() => setModalOpen(true)}
            title={location ? `${location} · ${radius} km` : "Set location"}
          >
            <MapPin size={18} />
          </button>
        </div>

        <NavLink to="/" className="home-nav__brand" end>
          The Local Herald
        </NavLink>

        <div className="home-nav__right">
          <NavLink to="/explore" className="home-nav__icon-btn" title="Explore">
            <Clock size={18} />
          </NavLink>
          <NavLink to="/login" className="home-nav__icon-btn" title="Profile">
            <User size={18} />
          </NavLink>
        </div>
      </nav>

      <LocationModal
        open={modalOpen}
        location={location}
        radius={radius}
        onLocationChange={setLocation}
        onRadiusChange={setRadius}
        onClose={() => setModalOpen(false)}
      />

      <main className="home-container">
        <ArticleSection title="Today" articles={TODAY_ARTICLES} />
        <ArticleSection title="This Week" articles={WEEK_ARTICLES} />
      </main>
      <div className="home-fade-bottom" />
    </>
  );
}
