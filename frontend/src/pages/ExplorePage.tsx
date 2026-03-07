import { useState, useEffect, useSyncExternalStore } from "react";
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
}

interface Area {
  id: string;
  name: string;
  lat: number;
  lng: number;
  articles: Article[];
}

const AREAS: Area[] = [
  {
    id: "downtown",
    name: "Downtown",
    lat: 61.4978,
    lng: 23.761,
    articles: [
      {
        id: 1,
        title: "City Council Approves Downtown Revitalization Plan",
        excerpt: "The $12M initiative aims to transform vacant lots into mixed-use spaces.",
        body: "The City Council voted 7-2 on Tuesday evening to approve a sweeping $12 million downtown revitalization plan that promises to reshape the heart of the city over the next three years.\n\nThe initiative targets six vacant lots along Main Street and Second Avenue. Plans call for a mix of affordable housing units, ground-floor retail spaces, and a new community center.\n\n\"This is a once-in-a-generation opportunity to reimagine what our downtown can be,\" said Mayor Elena Rodriguez.\n\nConstruction is expected to begin this fall, funded through federal grants, municipal bonds, and private investment.",
        category: "council",
        author: "Maria Santos",
        timeAgo: "2 hours ago",
      },
      {
        id: 3,
        title: "Local Bakery Expands to Second Location on Main Street",
        excerpt: "Sweet Rise Bakery will open its new storefront, creating 15 new jobs.",
        body: "Sweet Rise Bakery, a beloved neighborhood staple for eight years, announced plans to open a second location in the former Patterson Hardware building on Main Street.\n\nOwner Carmen Delgado said the expansion has been a long-held dream. The new 2,400-square-foot space will feature an expanded seating area, a dedicated pastry counter, and a small event space.\n\nRenovations are underway, with a grand opening planned for late spring.",
        category: "business",
        author: "Ana Gutierrez",
        timeAgo: "5 hours ago",
      },
    ],
  },
  {
    id: "northside",
    name: "Northside",
    lat: 61.5013,
    lng: 23.774,
    articles: [
      {
        id: 2,
        title: "Lincoln High Robotics Team Heads to State Championship",
        excerpt: "After an undefeated regional season, the team will compete against 40 schools.",
        body: "The Lincoln High School robotics team punched their ticket to the state championship after completing a flawless 12-0 regional season.\n\nThe team of 14 students designed and built a robot capable of navigating complex obstacle courses. Their creation, nicknamed \"Volt,\" consistently outperformed competitors.\n\nThe state championship will be held next month in Austin.",
        category: "schools",
        author: "James Liu",
        timeAgo: "4 hours ago",
      },
    ],
  },
  {
    id: "east-side",
    name: "East Side",
    lat: 61.4918,
    lng: 23.79,
    articles: [
      {
        id: 4,
        title: "Weekend Farmers Market Adds Evening Hours",
        excerpt: "Starting in June, the market will stay open until 8 PM on Thursdays.",
        body: "The Downtown Farmers Market announced Thursday evening hours from 4 PM to 8 PM beginning in June.\n\nThe move comes after feedback from residents who said the Saturday-only schedule was difficult for working families.\n\nThe Thursday evening market will feature live music and food trucks.",
        category: "events",
        author: "Tom Bradley",
        timeAgo: "6 hours ago",
      },
      {
        id: 5,
        title: "Community Garden Breaks Ground in East Side Park",
        excerpt: "Volunteers gathered to build 40 raised beds for residents.",
        body: "More than 60 volunteers turned out Saturday to break ground on a new community garden in East Side Park.\n\nThe garden features 40 raised beds, a shared tool shed, and accessible pathways. Plots are available at no cost.\n\nThe project was funded through city support and a crowdfunding campaign that raised over $8,000.",
        category: "community",
        author: "Priya Sharma",
        timeAgo: "2 days ago",
      },
    ],
  },
  {
    id: "westside",
    name: "Westside",
    lat: 61.4965,
    lng: 23.733,
    articles: [
      {
        id: 6,
        title: "Soccer Team Wins Regional Finals in Overtime",
        excerpt: "A last-minute goal sealed the victory, sending the team to state playoffs.",
        body: "The Riverside High girls' soccer team captured the regional championship with a dramatic 2-1 overtime victory.\n\nSophomore forward Daniela Cruz scored the winning goal with three minutes remaining in extra time.\n\nHead coach Maria Fernandez praised the team's resilience throughout the season.",
        category: "sports",
        author: "Marcus Johnson",
        timeAgo: "3 days ago",
      },
    ],
  },
];

function createAreaIcon(area: Area, active: boolean) {
  return L.divIcon({
    className: "",
    html: `<div class="explore-area-marker ${active ? "explore-area-marker--active" : ""}">
      ${area.name}
    </div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 14],
  });
}

function FlyToArea({ area }: { area: Area | null }) {
  const map = useMap();
  try {
    if (area && isFinite(area.lat) && isFinite(area.lng)) {
      const size = map.getSize();
      if (size.x > 0 && size.y > 0) {
        map.flyTo([area.lat, area.lng], 15, { duration: 0.5 });
      }
    }
  } catch {
    // Map not ready
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
  const [selectedArea, setSelectedArea] = useState<Area | null>(null);
  const [openArticle, setOpenArticle] = useState<Article | null>(null);
  const [showMap, setShowMap] = useState(false);

  const displayArticles = selectedArea ? selectedArea.articles : AREAS.flatMap((a) => a.articles);
  const totalCount = AREAS.reduce((sum, a) => sum + a.articles.length, 0);

  const center: [number, number] = [61.4978, 23.761];

  return (
    <div className="explore">
      <div className="explore__list" style={{ display: showMap ? "none" : undefined }}>
        <div className="explore__list-header">
          {selectedArea ? (
            <>
              <button className="explore__back-area" onClick={() => setSelectedArea(null)}>
                <ArrowLeft size={16} />
                All areas
              </button>
              <p className="explore__count">
                {selectedArea.articles.length} {selectedArea.articles.length === 1 ? "story" : "stories"} in {selectedArea.name}
              </p>
            </>
          ) : (
            <p className="explore__count">{totalCount} stories in your area</p>
          )}
        </div>

        {!selectedArea && (
          <div className="explore__areas">
            {AREAS.map((area) => (
              <button
                key={area.id}
                className="explore-area-card"
                onClick={() => setSelectedArea(area)}
              >
                <span className="explore-area-card__name">{area.name}</span>
                <span className="explore-area-card__count">
                  {area.articles.length} {area.articles.length === 1 ? "story" : "stories"}
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="explore__grid">
          {displayArticles.map((article) => (
            <article
              key={article.id}
              className="card explore-card"
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
        >
          <MapContainer
            center={center}
            zoom={13}
            style={{ width: "100%", height: "100%" }}
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
            />
            {AREAS.map((area) => (
              <Marker
                key={area.id}
                position={[area.lat, area.lng]}
                icon={createAreaIcon(area, selectedArea?.id === area.id)}
                eventHandlers={{
                  click: () => {
                    setSelectedArea(selectedArea?.id === area.id ? null : area);
                    if (!isDesktop) setShowMap(false);
                  },
                }}
              />
            ))}
            <FlyToArea area={selectedArea} />
          </MapContainer>
        </div>
      )}

      <button
        className="btn btn-primary btn-lg explore__map-toggle"
        onClick={() => { setShowMap(!showMap); }}
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
