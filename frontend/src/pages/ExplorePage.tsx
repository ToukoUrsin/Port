import { useState, useCallback, useEffect } from "react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import { Link, useNavigate } from "react-router-dom";
import { MapPin } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { getLocations } from "@/lib/api";
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

const STORAGE_KEY = "selected_locations";

export function getSavedLocationIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function coverageTier(count: number): string {
  if (count === 0) return "explore-marker--no-coverage";
  if (count <= 2) return "explore-marker--low-coverage";
  return "";
}

function createAreaIcon(area: Area, selected: boolean) {
  const tier = coverageTier(area.articleCount);
  return L.divIcon({
    className: "",
    html: `<div class="explore-marker ${selected ? "explore-marker--active" : ""} ${tier}">
      ${selected ? '<span class="explore-marker__check">&#10003;</span>' : ""}
      <span class="explore-marker__name">${area.name}</span>
    </div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 14],
  });
}

export default function ExplorePage() {
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fetchLocations = useCallback(() => getLocations(), []);
  const { data: locData } = useApi(fetchLocations, []);

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

  // Load saved selections once areas are available
  useEffect(() => {
    if (areas.length === 0) return;
    const saved = getSavedLocationIds();
    if (saved.length > 0) {
      setSelectedIds(new Set(saved));
    }
  }, [areas.length]);

  function toggleArea(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleApply() {
    const ids = Array.from(selectedIds);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    navigate("/");
  }

  const center: [number, number] = [60.1233, 24.4397];

  return (
    <>
      <Navbar
        left={
          <Link to="/explore" className="home-nav__city-btn">
            <MapPin size={16} />
            <span>Select areas</span>
          </Link>
        }
      />
      <div className="explore">
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
              icon={createAreaIcon(area, selectedIds.has(area.id))}
              eventHandlers={{
                click: () => toggleArea(area.id),
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
              ? "Select areas on the map"
              : `Apply (${selectedIds.size})`}
          </button>
        </div>
      </div>
      <BottomBar />
    </>
  );
}
