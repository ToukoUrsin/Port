import { useState, useSyncExternalStore } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import { Link } from "react-router-dom";
import { Clock, ImageIcon, ArrowLeft } from "lucide-react";
import { ARTICLES, authorSlug } from "@/data/articles";
import Navbar from "@/components/Navbar";
import BottomBar from "@/components/BottomBar";
import "leaflet/dist/leaflet.css";
import "./ExplorePage.css";

interface Area {
  id: string;
  name: string;
  lat: number;
  lng: number;
  articleIds: number[];
}

const AREAS: Area[] = [
  { id: "downtown", name: "Downtown", lat: 61.4978, lng: 23.761, articleIds: [1, 3, 7] },
  { id: "northside", name: "Northside", lat: 61.5013, lng: 23.774, articleIds: [2, 8] },
  { id: "east-side", name: "East Side", lat: 61.4918, lng: 23.79, articleIds: [4, 5] },
  { id: "westside", name: "Westside", lat: 61.4965, lng: 23.733, articleIds: [6] },
];

function getAreaArticles(area: Area) {
  return area.articleIds.map((id) => ARTICLES.find((a) => a.id === id)!).filter(Boolean);
}

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
  const [showMap, setShowMap] = useState(false);

  const displayArticles = selectedArea ? getAreaArticles(selectedArea) : ARTICLES;
  const totalCount = ARTICLES.length;

  const center: [number, number] = [61.4978, 23.761];

  return (
    <>
      <Navbar />
    <div className="explore">
      <div className="explore__list" style={{ display: showMap ? "none" : undefined }}>
        {selectedArea && (
          <button className="explore__back-area" onClick={() => setSelectedArea(null)}>
            <ArrowLeft size={16} />
            All areas
          </button>
        )}
        <div className="explore__list-header">
          {selectedArea ? (
            <p className="explore__count">
              {getAreaArticles(selectedArea).length} {getAreaArticles(selectedArea).length === 1 ? "story" : "stories"} in {selectedArea.name}
            </p>
          ) : (
            <p className="explore__count">
              {totalCount} stories in your area
            </p>
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
                  {area.articleIds.length} {area.articleIds.length === 1 ? "story" : "stories"}
                </span>
              </button>
            ))}
          </div>
        )}

        {selectedArea && <div className="explore__grid">
          {displayArticles.map((article) => (
            <Link
              key={article.id}
              to={`/article/${article.id}`}
              className="card explore-card"
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div className="explore-card__img">
                {article.image ? (
                  <img src={article.image} alt={article.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <ImageIcon size={28} />
                )}
              </div>
              <div className="explore-card__body">
                <h3 className="explore-card__title">{article.title}</h3>
                <p className="explore-card__excerpt">{article.excerpt}</p>
                <div className="explore-card__meta">
                  <Link
                    to={`/profile/${authorSlug(article.author)}`}
                    className="explore-card__author-link"
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
          ))}
        </div>}
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

    </div>
      <BottomBar />
    </>
  );
}
