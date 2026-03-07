import { useState, useMemo, useEffect, useSyncExternalStore } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import { Clock, ImageIcon, ArrowLeft } from "lucide-react";
import "leaflet/dist/leaflet.css";
import "./ExplorePage.css";

interface Article {
  id: number;
  title: string;
  excerpt: string;
  body: string;
  category: string;
  author: string;
  timeAgo: string;
  lat: number;
  lng: number;
}

const MOCK_ARTICLES: Article[] = [
  {
    id: 1,
    title: "City Council Approves Downtown Revitalization Plan",
    excerpt:
      "The $12M initiative aims to transform vacant lots into mixed-use spaces, with construction expected to begin this fall.",
    body: "The City Council voted 7-2 on Tuesday evening to approve a sweeping $12 million downtown revitalization plan that promises to reshape the heart of the city over the next three years.\n\nThe initiative, which has been in development for over 18 months, targets six vacant lots along Main Street and Second Avenue. Plans call for a mix of affordable housing units, ground-floor retail spaces, and a new community center.\n\n\"This is a once-in-a-generation opportunity to reimagine what our downtown can be,\" said Mayor Elena Rodriguez during the session. \"We're not just filling empty lots — we're building the foundation for the next chapter of our city.\"\n\nConstruction is expected to begin this fall, with the first phase focusing on the two largest lots near the intersection of Main and Oak streets. The project is funded through a combination of federal grants, municipal bonds, and private investment.",
    category: "council",
    author: "Maria Santos",
    timeAgo: "2 hours ago",
    lat: 61.4978,
    lng: 23.761,
  },
  {
    id: 2,
    title: "Lincoln High Robotics Team Heads to State Championship",
    excerpt:
      "After an undefeated regional season, the team will compete against 40 schools next month.",
    body: "The Lincoln High School robotics team, the Circuit Breakers, punched their ticket to the state championship after completing a flawless regional season with a 12-0 record.\n\nThe team of 14 students, led by captain Aisha Patel, designed and built a robot capable of navigating complex obstacle courses while performing precision tasks. Their creation, nicknamed \"Volt,\" consistently outperformed competitors in both speed and accuracy.\n\n\"These students have put in hundreds of hours of work since September,\" said faculty advisor Mr. David Kim. \"Their dedication and teamwork have been extraordinary.\"\n\nThe state championship will be held next month in Austin, where Lincoln High will face 40 qualifying teams from across the state.",
    category: "schools",
    author: "James Liu",
    timeAgo: "4 hours ago",
    lat: 61.5013,
    lng: 23.774,
  },
  {
    id: 3,
    title: "Local Bakery Expands to Second Location on Main Street",
    excerpt:
      "Sweet Rise Bakery will open its new storefront in the former hardware store space, creating 15 new jobs.",
    body: "Sweet Rise Bakery, a beloved neighborhood staple for the past eight years, announced plans to open a second location in the former Patterson Hardware building on Main Street.\n\nOwner and head baker Carmen Delgado said the expansion has been a long-held dream. \"We've been bursting at the seams in our current space for years,\" she said. \"This new location will let us serve more of the community while keeping everything we bake fresh and handmade.\"\n\nThe new 2,400-square-foot space will feature an expanded seating area, a dedicated pastry counter, and a small event space for community gatherings. The bakery expects to hire 15 new employees.\n\nRenovations are underway, with a grand opening planned for late spring.",
    category: "business",
    author: "Ana Gutierrez",
    timeAgo: "5 hours ago",
    lat: 61.4945,
    lng: 23.749,
  },
  {
    id: 4,
    title: "Weekend Farmers Market Adds Evening Hours",
    excerpt:
      "Starting in June, the market will stay open until 8 PM on Thursdays to accommodate working families.",
    body: "The Downtown Farmers Market announced an expansion of its schedule, adding Thursday evening hours from 4 PM to 8 PM beginning in June.\n\nThe move comes after months of feedback from residents who said the Saturday-only schedule made it difficult for working families to shop for fresh, locally grown produce.\n\n\"We heard the community loud and clear,\" said market director Patricia Owens. \"Everyone deserves access to fresh, local food, regardless of their work schedule.\"\n\nThe Thursday evening market will feature the same mix of vendors, plus live music and food trucks to create a casual community gathering atmosphere.",
    category: "events",
    author: "Tom Bradley",
    timeAgo: "6 hours ago",
    lat: 61.5001,
    lng: 23.79,
  },
  {
    id: 5,
    title: "Community Garden Breaks Ground in East Side Park",
    excerpt:
      "Volunteers gathered Saturday to build 40 raised beds, with plots available to residents on a first-come basis.",
    body: "More than 60 volunteers turned out Saturday morning to break ground on a new community garden in East Side Park, marking the culmination of a two-year grassroots effort.\n\nThe garden features 40 raised beds, a shared tool shed, a composting station, and accessible pathways. Plots are available to city residents on a first-come, first-served basis at no cost.\n\n\"This garden isn't just about growing food,\" said organizer Priya Sharma. \"It's about growing connections between neighbors who might never have met otherwise.\"\n\nThe project was funded through a combination of city parks department support and a successful crowdfunding campaign that raised over $8,000.",
    category: "community",
    author: "Priya Sharma",
    timeAgo: "2 days ago",
    lat: 61.4918,
    lng: 23.772,
  },
  {
    id: 6,
    title: "Soccer Team Wins Regional Finals in Overtime",
    excerpt:
      "A last-minute goal from sophomore Daniela Cruz sealed the victory, sending the team to state playoffs.",
    body: "The Riverside High girls' soccer team captured the regional championship Saturday with a dramatic 2-1 overtime victory over defending champions Westfield Academy.\n\nWith the score tied 1-1 and just three minutes remaining in extra time, sophomore forward Daniela Cruz collected a through ball from midfielder Kai Thompson and slotted it past the keeper to send the home crowd into a frenzy.\n\n\"I saw the gap and just went for it,\" Cruz said after the match, still catching her breath. \"This team has worked so hard all season. We deserve this.\"\n\nHead coach Maria Fernandez praised the team's resilience. \"We were down early and could have folded, but these players never stop believing in each other.\"",
    category: "sports",
    author: "Marcus Johnson",
    timeAgo: "3 days ago",
    lat: 61.4965,
    lng: 23.733,
  },
];

function createMarkerIcon(active: boolean, article?: Article) {
  const tooltip = active && article
    ? `<div class="explore-marker-tooltip">
        <strong>${article.title}</strong>
        <span>${article.timeAgo}</span>
      </div>`
    : "";
  return L.divIcon({
    className: "",
    html: `<div class="explore-marker ${active ? "explore-marker--active" : ""}">${tooltip}</div>`,
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  });
}

function FlyToArticle({ article }: { article: Article | null }) {
  const map = useMap();
  try {
    if (article && isFinite(article.lat) && isFinite(article.lng)) {
      const size = map.getSize();
      if (size.x > 0 && size.y > 0) {
        map.flyTo([article.lat, article.lng], 15, { duration: 0.5 });
      }
    }
  } catch {
    // Map not ready or hidden
  }
  return null;
}

function ArticleDetail({
  article,
  onClose,
}: {
  article: Article;
  onClose: () => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  return (
    <div className={`explore-detail ${visible ? "explore-detail--visible" : ""}`}>
      <button className="explore-detail__back" onClick={handleClose}>
        <ArrowLeft size={18} />
        Back
      </button>

      <div className="explore-detail__hero">
        <ImageIcon size={48} />
      </div>

      <div className="explore-detail__body">
        <p className="explore-detail__time">
          <Clock size={14} />
          {article.timeAgo}
        </p>
        <h1 className="explore-detail__title">{article.title}</h1>
        <p className="explore-detail__author">By {article.author}</p>
        <div className="explore-detail__text">
          {article.body.split("\n\n").map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

const mediaQuery = "(min-width: 768px)";
const subscribe = (cb: () => void) => {
  const mql = window.matchMedia(mediaQuery);
  mql.addEventListener("change", cb);
  return () => mql.removeEventListener("change", cb);
};
const getSnapshot = () => window.matchMedia(mediaQuery).matches;
const getServerSnapshot = () => true;

export default function ExplorePage() {
  const isDesktop = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [openArticle, setOpenArticle] = useState<Article | null>(null);
  const [showMap, setShowMap] = useState(false);

  const activeArticle = useMemo(
    () => MOCK_ARTICLES.find((a) => a.id === activeId) ?? null,
    [activeId]
  );

  const center: [number, number] = [61.4978, 23.761];

  // On mobile map, tapping a marker shows preview; on desktop or list, open directly
  const handleMarkerClick = (article: Article) => {
    if (!isDesktop && showMap) {
      setActiveId(article.id);
    } else {
      setOpenArticle(article);
    }
  };

  const previewArticle = useMemo(
    () => (!isDesktop && showMap && activeId) ? MOCK_ARTICLES.find((a) => a.id === activeId) ?? null : null,
    [isDesktop, showMap, activeId]
  );

  return (
    <div className="explore">
      <div className="explore__list" style={{ display: showMap ? "none" : undefined }}>
        <p className="explore__count">
          {MOCK_ARTICLES.length} stories in your area
        </p>
        <div className="explore__grid">
          {MOCK_ARTICLES.map((article) => (
            <article
              key={article.id}
              className={`card explore-card ${activeId === article.id ? "explore-card--active" : ""}`}
              onMouseEnter={() => setActiveId(article.id)}
              onMouseLeave={() => setActiveId(null)}
              onClick={() => setOpenArticle(article)}
            >
              <div className="explore-card__img">
                <ImageIcon size={28} />
              </div>
              <div className="explore-card__body">
                <h3 className="explore-card__title">{article.title}</h3>
                <p className="explore-card__excerpt">{article.excerpt}</p>
                <div className="explore-card__meta">
                  <span>{article.author}</span>
                  <span>&middot;</span>
                  <Clock size={12} />
                  <span>{article.timeAgo}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
        <div className="explore__list-fade" />
      </div>

      {(isDesktop || showMap) && (
        <div
          className="explore__map"
          style={isDesktop ? undefined : { display: "block", flex: "1 1 100%" }}
          onClick={() => { if (!isDesktop) setActiveId(null); }}
        >
          <MapContainer
            center={center}
            zoom={14}
            style={{ width: "100%", height: "100%" }}
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
            />
            {MOCK_ARTICLES.map((article) => (
              <Marker
                key={article.id}
                position={[article.lat, article.lng]}
                icon={createMarkerIcon(activeId === article.id, article)}
                eventHandlers={{
                  mouseover: () => { if (isDesktop) setActiveId(article.id); },
                  mouseout: () => { if (isDesktop) setActiveId(null); },
                  click: () => handleMarkerClick(article),
                }}
              />
            ))}
            <FlyToArticle article={activeArticle} />
          </MapContainer>
        </div>
      )}

      {/* Mobile map preview card */}
      {previewArticle && (
        <div
          className="explore-preview"
          onClick={() => setOpenArticle(previewArticle)}
        >
          <div className="explore-preview__img">
            <ImageIcon size={20} />
          </div>
          <div className="explore-preview__body">
            <h4 className="explore-preview__title">{previewArticle.title}</h4>
            <p className="explore-preview__meta">
              {previewArticle.author} &middot; {previewArticle.timeAgo}
            </p>
          </div>
        </div>
      )}

      <button
        className="btn btn-primary btn-lg explore__map-toggle"
        onClick={() => { setShowMap(!showMap); setActiveId(null); }}
      >
        {showMap ? "Show list" : "Show map"}
      </button>

      {openArticle && (
        <ArticleDetail
          article={openArticle}
          onClose={() => setOpenArticle(null)}
        />
      )}
    </div>
  );
}
