import { useState, useCallback, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { useNavigate, useSearchParams, Navigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDocumentHead } from "@/hooks/useDocumentHead";
import { getLocations } from "@/lib/api";
import type { ApiLocation } from "@/lib/types";
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
  path: string;
}

const STORAGE_KEY = "selected_locations";
const STORAGE_PATHS_KEY = "selected_location_paths";

export function getSavedLocationIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function getSavedLocationPaths(): Map<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_PATHS_KEY);
    return raw ? new Map(JSON.parse(raw)) : new Map();
  } catch {
    return new Map();
  }
}

function coverageTier(count: number): string {
  if (count === 0) return "explore-marker--no-coverage";
  if (count <= 2) return "explore-marker--low-coverage";
  return "";
}

function createAreaIcon(area: Area, selected: boolean, hasSelectedChild: boolean) {
  const tier = coverageTier(area.articleCount);
  const cls = selected
    ? "explore-marker--active"
    : hasSelectedChild
      ? "explore-marker--has-selected"
      : "";
  return L.divIcon({
    className: "",
    html: `<div class="explore-marker ${cls} ${tier}">
      ${selected ? '<span class="explore-marker__check">&#10003;</span>' : ""}
      ${hasSelectedChild && !selected ? '<span class="explore-marker__check">&#9679;</span>' : ""}
      <span class="explore-marker__name">${area.name}</span>
    </div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 14],
  });
}

function toAreas(locations: ApiLocation[]): Area[] {
  return locations
    .filter((loc) => loc.lat != null && loc.lng != null)
    .map((loc) => ({
      id: loc.id,
      name: loc.name,
      lat: loc.lat!,
      lng: loc.lng!,
      articleCount: loc.article_count,
      slug: loc.slug,
      path: loc.path,
    }));
}

function MapEventHandler({
  onViewportChange,
}: {
  onViewportChange: (bounds: L.LatLngBounds, zoom: number) => void;
}) {
  const map = useMapEvents({
    moveend: () => {
      onViewportChange(map.getBounds(), map.getZoom());
    },
    zoomend: () => {
      onViewportChange(map.getBounds(), map.getZoom());
    },
  });

  // Fire initial fetch once the map is ready
  useEffect(() => {
    onViewportChange(map.getBounds(), map.getZoom());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

/** Redirect /explore?town=slug to /?location=slug */
export function ExploreRedirectGuard() {
  const [searchParams] = useSearchParams();
  const townParam = searchParams.get("town");
  if (townParam) {
    return <Navigate to={`/?location=${encodeURIComponent(townParam)}`} replace />;
  }
  return <ExplorePage />;
}

export default function ExplorePage() {
  const { t } = useLanguage();
  useDocumentHead({ title: "Explore" });
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedPaths, setSelectedPaths] = useState<Map<string, string>>(new Map());
  const [areas, setAreas] = useState<Area[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedLoaded = useRef(false);

  // Load saved selections once on mount
  useEffect(() => {
    const saved = getSavedLocationIds();
    if (saved.length > 0) {
      setSelectedIds(new Set(saved));
      setSelectedPaths(getSavedLocationPaths());
    }
    savedLoaded.current = true;
  }, []);

  const handleViewportChange = useCallback(
    (bounds: L.LatLngBounds, zoom: number) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        // Gradual zoom hierarchy:
        // 1-2: continents | 3: continents+countries | 4-5: countries
        // 6: countries+regions | 7-8: regions | 9: regions+cities | 10+: cities
        let levels: number[];
        if (zoom <= 2) levels = [0];
        else if (zoom === 3) levels = [0, 1];
        else if (zoom === 4) levels = [1];
        else if (zoom === 5) levels = [1, 2];
        else if (zoom <= 6) levels = [2];
        else if (zoom === 7) levels = [2, 3];
        else levels = [3];

        const useBbox = zoom > 2;
        const params: Parameters<typeof getLocations>[0] = {
          level: levels,
          limit: 300,
          min_articles: 1,
          ...(useBbox && {
            south: bounds.getSouth(),
            west: bounds.getWest(),
            north: bounds.getNorth(),
            east: bounds.getEast(),
          }),
        };

        getLocations(params).then((res) => {
          setAreas(toAreas(res.locations));
        });
      }, 300);
    },
    [],
  );

  function toggleArea(area: Area) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(area.id)) next.delete(area.id);
      else next.add(area.id);
      return next;
    });
    setSelectedPaths((prev) => {
      const next = new Map(prev);
      if (next.has(area.id)) next.delete(area.id);
      else next.set(area.id, area.path);
      return next;
    });
  }

  function handleApply() {
    const ids = Array.from(selectedIds);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    localStorage.setItem(STORAGE_PATHS_KEY, JSON.stringify(Array.from(selectedPaths.entries())));
    navigate("/");
  }

  function hasSelectedDescendant(area: Area): boolean {
    if (selectedPaths.size === 0) return false;
    const prefix = area.path + "/";
    for (const path of selectedPaths.values()) {
      if (path.startsWith(prefix)) return true;
    }
    return false;
  }

  const center: [number, number] = [20, 0];

  return (
    <>
      <Navbar />
      <div className="explore">
        <MapContainer
          center={center}
          zoom={3}
          style={{ width: "100%", height: "100%" }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
          />
          <MapEventHandler onViewportChange={handleViewportChange} />
          {areas.map((area) => (
            <Marker
              key={area.id}
              position={[area.lat, area.lng]}
              icon={createAreaIcon(area, selectedIds.has(area.id), hasSelectedDescendant(area))}
              eventHandlers={{
                click: () => toggleArea(area),
              }}
            />
          ))}
        </MapContainer>

        <div className="explore-bottom">
          <button
            className="explore-bottom__apply"
            onClick={handleApply}
            disabled={selectedIds.size === 0}
          >
            {selectedIds.size === 0
              ? t("explore.selectAreas")
              : `${t("explore.apply")} (${selectedIds.size})`}
          </button>
        </div>
      </div>
      <BottomBar />
    </>
  );
}
