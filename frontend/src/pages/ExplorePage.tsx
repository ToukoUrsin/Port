import { useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import { Check } from "lucide-react";
import "leaflet/dist/leaflet.css";
import "./ExplorePage.css";

interface City {
  name: string;
  lat: number;
  lng: number;
}

const FINNISH_CITIES: City[] = [
  { name: "Helsinki", lat: 60.1699, lng: 24.9384 },
  { name: "Espoo", lat: 60.2055, lng: 24.6559 },
  { name: "Tampere", lat: 61.4978, lng: 23.761 },
  { name: "Vantaa", lat: 60.2934, lng: 25.0378 },
  { name: "Oulu", lat: 65.0121, lng: 25.4651 },
  { name: "Turku", lat: 60.4518, lng: 22.2666 },
  { name: "Jyväskylä", lat: 62.2426, lng: 25.7473 },
  { name: "Lahti", lat: 60.9827, lng: 25.6612 },
  { name: "Kuopio", lat: 62.8924, lng: 27.677 },
  { name: "Pori", lat: 61.4851, lng: 21.7974 },
  { name: "Joensuu", lat: 62.601, lng: 29.7636 },
  { name: "Lappeenranta", lat: 61.0587, lng: 28.1887 },
  { name: "Vaasa", lat: 63.096, lng: 21.6158 },
  { name: "Rovaniemi", lat: 66.5039, lng: 25.7294 },
  { name: "Hämeenlinna", lat: 60.9929, lng: 24.4604 },
  { name: "Kotka", lat: 60.4664, lng: 26.9458 },
  { name: "Mikkeli", lat: 61.6886, lng: 27.2723 },
  { name: "Seinäjoki", lat: 62.7903, lng: 22.8403 },
  { name: "Kokkola", lat: 63.8384, lng: 23.1304 },
  { name: "Kajaani", lat: 64.2273, lng: 27.7285 },
];

function createCityIcon(city: City, selected: boolean) {
  return L.divIcon({
    className: "",
    html: `<div class="explore-city-marker ${selected ? "explore-city-marker--selected" : ""}">${city.name}</div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 14],
  });
}

function FitFinland() {
  const map = useMap();
  const fitted = useRef(false);
  if (!fitted.current) {
    fitted.current = true;
    map.fitBounds(
      [
        [59.8, 20.5],
        [70.1, 31.6],
      ],
      { padding: [20, 20] }
    );
  }
  return null;
}

export default function ExplorePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialCities = searchParams.getAll("city");
  const [selected, setSelected] = useState<Set<string>>(new Set(initialCities));

  function toggleCity(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }

  function handleConfirm() {
    const params = new URLSearchParams();
    selected.forEach((c) => params.append("city", c));
    navigate(`/?${params.toString()}`);
  }

  return (
    <div className="explore-fullmap">
      <MapContainer
        center={[64.5, 26.0]}
        zoom={5}
        style={{ width: "100%", height: "100%" }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
        />
        {FINNISH_CITIES.map((city) => (
          <Marker
            key={city.name}
            position={[city.lat, city.lng]}
            icon={createCityIcon(city, selected.has(city.name))}
            eventHandlers={{
              click: () => toggleCity(city.name),
            }}
          />
        ))}
        <FitFinland />
      </MapContainer>

      {selected.size > 0 && (
        <button className="explore-confirm" onClick={handleConfirm}>
          <Check size={18} />
          <span>
            Show news for {selected.size} {selected.size === 1 ? "city" : "cities"}
          </span>
        </button>
      )}
    </div>
  );
}
