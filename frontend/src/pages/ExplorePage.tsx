import { useState, useCallback, useSyncExternalStore } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import { Link } from "react-router-dom";
import { Clock, ImageIcon, ArrowLeft, Loader2 } from "lucide-react";
import { authorSlug } from "@/data/articles";
import { useApi } from "@/hooks/useApi";
import { getLocations, getLocationArticles } from "@/lib/api";
import { apiToArticle } from "@/lib/types";
import type { Article } from "@/data/articles";
import Navbar from "@/components/Navbar";
import BottomBar from "@/components/BottomBar";
import "leaflet/dist/leaflet.css";
import "./ExplorePage.css";

interface Area {
  id: string;
  name: string;
  lat: number;
  lng: number;
  articleCount: number;
  slug: string;
}

function coverageTier(count: number): string {
  if (count === 0) return "explore-area-marker--no-coverage";
  if (count <= 2) return "explore-area-marker--low-coverage";
  return "";
}

function createAreaIcon(area: Area, active: boolean) {
  const tier = coverageTier(area.articleCount);
  return L.divIcon({
    className: "",
    html: `<div class="explore-area-marker ${active ? "explore-area-marker--active" : ""} ${tier}">
      ${area.name}
      <span class="explore-area-marker__count">${area.articleCount}</span>
    </div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 14],
  });
}

function CoverageLegend() {
  return (
    <div className="explore-legend">
      <span className="explore-legend__item"><span className="explore-legend__dot explore-legend__dot--covered" /> 3+ stories</span>
      <span className="explore-legend__item"><span className="explore-legend__dot explore-legend__dot--low" /> 1-2 stories</span>
      <span className="explore-legend__item"><span className="explore-legend__dot explore-legend__dot--none" /> No coverage</span>
    </div>
  );
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

  const fetchLocations = useCallback(() => getLocations(), []);
  const { data: locData, isLoading: locsLoading } = useApi(fetchLocations, []);

  const areas: Area[] = (locData?.locations ?? [])
    .filter((loc) => loc.lat != null && loc.lng != null)
    .map((loc) => ({
      id: loc.id,
      name: loc.name,
      lat: loc.lat!,
      lng: loc.lng!,
      articleCount: loc.article_count,
      slug: loc.slug,
    }));

  const fetchAreaArticles = useCallback(
    () => selectedArea ? getLocationArticles(selectedArea.slug) : Promise.resolve({ articles: [] }),
    [selectedArea],
  );
  const { data: areaArticlesData, isLoading: articlesLoading } = useApi(fetchAreaArticles, [selectedArea?.slug]);

  const displayArticles: Article[] = selectedArea
    ? (areaArticlesData?.articles ?? []).map(apiToArticle)
    : [];

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
              {displayArticles.length} {displayArticles.length === 1 ? "story" : "stories"} in {selectedArea.name}
            </p>
          ) : (
            <>
              <p className="explore__count">
                {areas.reduce((sum, a) => sum + a.articleCount, 0)} stories in your area
              </p>
              <CoverageLegend />
            </>
          )}
        </div>

        {locsLoading && (
          <div style={{ textAlign: "center", padding: "var(--space-8)", color: "var(--color-text-tertiary)" }}>
            <Loader2 size={24} className="animate-spin" />
          </div>
        )}

        {!selectedArea && !locsLoading && (
          <div className="explore__areas">
            {areas.map((area) => (
              <button
                key={area.id}
                className={`explore-area-card ${area.articleCount === 0 ? "explore-area-card--empty" : ""}`}
                onClick={() => setSelectedArea(area)}
              >
                <span className="explore-area-card__name">{area.name}</span>
                <span className="explore-area-card__count">
                  {area.articleCount} {area.articleCount === 1 ? "story" : "stories"}
                </span>
              </button>
            ))}
          </div>
        )}

        {selectedArea && articlesLoading && (
          <div style={{ textAlign: "center", padding: "var(--space-8)", color: "var(--color-text-tertiary)" }}>
            <Loader2 size={24} className="animate-spin" />
          </div>
        )}

        {selectedArea && !articlesLoading && <div className="explore__grid">
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
            {areas.map((area) => (
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
