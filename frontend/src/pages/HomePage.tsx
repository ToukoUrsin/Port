import { useState } from "react";
import { NavLink } from "react-router-dom";
import { Clock, ImageIcon, ChevronDown, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import "./HomePage.css";

interface Article {
  id: number;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  timeAgo: string;
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
  },
  {
    id: 3,
    title: "Local Bakery Expands to Second Location on Main Street",
    excerpt:
      "Sweet Rise Bakery will open its new storefront in the former hardware store space, creating 15 new jobs.",
    category: "business",
    author: "Ana Gutierrez",
    timeAgo: "5 hours ago",
  },
  {
    id: 4,
    title: "Weekend Farmers Market Adds Evening Hours for Summer",
    excerpt:
      "Starting in June, the market will stay open until 8 PM on Thursdays to accommodate working families.",
    category: "events",
    author: "Tom Bradley",
    timeAgo: "6 hours ago",
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
  },
  {
    id: 6,
    title: "High School Soccer Team Wins Regional Finals in Overtime",
    excerpt:
      "A last-minute goal from sophomore Daniela Cruz sealed the victory, sending the team to state playoffs.",
    category: "sports",
    author: "Marcus Johnson",
    timeAgo: "3 days ago",
  },
  {
    id: 7,
    title: "Water Main Replacement Project Starts Next Week on Oak Avenue",
    excerpt:
      "Expect lane closures and detours for approximately six weeks as aging infrastructure is replaced.",
    category: "council",
    author: "Sarah Chen",
    timeAgo: "4 days ago",
  },
  {
    id: 8,
    title: "New After-School Program Launches at Three Elementary Schools",
    excerpt:
      "The free program offers tutoring, arts, and sports activities until 6 PM for working families.",
    category: "schools",
    author: "James Liu",
    timeAgo: "5 days ago",
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

function LocationFilter({
  location,
  radius,
  onLocationChange,
  onRadiusChange,
}: {
  location: string;
  radius: number;
  onLocationChange: (v: string) => void;
  onRadiusChange: (v: number) => void;
}) {
  return (
    <div className="location-filter">
      <div className="location-filter__inner">
        <div className="location-filter__field">
          <MapPin size={16} className="location-filter__icon" />
          <Input
            type="text"
            placeholder="Enter your city or address"
            value={location}
            onChange={(e) => onLocationChange(e.target.value)}
            className="location-filter__input"
          />
        </div>
        <div className="location-filter__divider" />
        <div className="location-filter__field">
          <span className="location-filter__label">Radius</span>
          <select
            className="location-filter__select"
            value={radius}
            onChange={(e) => onRadiusChange(Number(e.target.value))}
          >
            {RADIUS_OPTIONS.map((km) => (
              <option key={km} value={km}>
                {km} km
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

const INITIAL_COUNT = 2;

function ArticleCard({ article }: { article: Article }) {
  return (
    <article className={`card article-card ${article.isLead ? "article-card--lead" : ""}`}>
      <div className="article-card__img">
        <div className="article-card__img-placeholder">
          <ImageIcon size={32} />
        </div>
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
        {visible.map((article) => (
          <ArticleCard key={article.id} article={article} />
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

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <>
      <header className="home-header">
        <h1 className="home-masthead">The Local Herald</h1>
        <p className="home-date">{today}</p>
      </header>

      <nav className="home-nav">
        <NavLink to="/" className={({ isActive }) => isActive ? "home-nav__link active" : "home-nav__link"} end>
          Home
        </NavLink>
        <NavLink to="/explore" className={({ isActive }) => isActive ? "home-nav__link active" : "home-nav__link"}>
          Explore
        </NavLink>
        <NavLink to="/login" className={({ isActive }) => isActive ? "home-nav__link active" : "home-nav__link"}>
          Login
        </NavLink>
      </nav>

      <LocationFilter
        location={location}
        radius={radius}
        onLocationChange={setLocation}
        onRadiusChange={setRadius}
      />

      <main className="home-container">
        <ArticleSection title="Today" articles={TODAY_ARTICLES} />
        <ArticleSection title="This Week" articles={WEEK_ARTICLES} />
      </main>
      <div className="home-fade-bottom" />
    </>
  );
}
