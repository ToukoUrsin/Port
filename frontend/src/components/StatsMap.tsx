import {
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
  useCallback,
} from "react";
import L from "leaflet";
import type { RequestEvent } from "@/lib/adminStats";
import "leaflet/dist/leaflet.css";
import "./StatsMap.css";

const OTANIEMI: [number, number] = [60.1867, 24.8283];
const TILE_URL =
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

export interface StatsMapHandle {
  addArc: (event: RequestEvent) => void;
}

const StatsMap = forwardRef<StatsMapHandle>(function StatsMap(_props, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [30, 10],
      zoom: 2,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer(TILE_URL, {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    }).addTo(map);

    // Pulsing marker at Otaniemi
    const pulseIcon = L.divIcon({
      className: "",
      html: '<div class="stats-map__pulse"><div class="stats-map__pulse-ring"></div><div class="stats-map__pulse-dot"></div></div>',
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });
    L.marker(OTANIEMI, { icon: pulseIcon }).addTo(map);

    // SVG overlay for arcs
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.classList.add("stats-map__svg-overlay");
    svg.style.position = "absolute";
    svg.style.top = "0";
    svg.style.left = "0";
    svg.style.width = "100%";
    svg.style.height = "100%";
    svg.style.pointerEvents = "none";
    svg.style.zIndex = "500";
    map.getContainer().querySelector(".leaflet-map-pane")?.appendChild(svg);

    mapRef.current = map;
    svgRef.current = svg;

    return () => {
      map.remove();
      mapRef.current = null;
      svgRef.current = null;
    };
  }, []);

  const drawArc = useCallback((fromLat: number, fromLng: number, cityName: string) => {
    const map = mapRef.current;
    const svg = svgRef.current;
    if (!map || !svg) return;

    const from = map.latLngToContainerPoint([fromLat, fromLng]);
    const to = map.latLngToContainerPoint(OTANIEMI);

    // Quadratic bezier control point (arc upward)
    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const curveHeight = Math.min(dist * 0.3, 150);

    // Perpendicular offset for the control point
    const nx = -dy / dist;
    const ny = dx / dist;
    const cx = midX + nx * curveHeight;
    const cy = midY + ny * curveHeight;

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const d = `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`;
    path.setAttribute("d", d);
    path.classList.add("stats-map__arc");

    const length = path.getTotalLength();
    path.style.strokeDasharray = `${length}`;
    path.style.strokeDashoffset = `${length}`;

    svg.appendChild(path);

    // City label
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", String(from.x));
    text.setAttribute("y", String(from.y - 8));
    text.classList.add("stats-map__city-label");
    text.textContent = cityName;
    svg.appendChild(text);

    // Origin dot
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", String(from.x));
    circle.setAttribute("cy", String(from.y));
    circle.setAttribute("r", "3");
    circle.classList.add("stats-map__origin-dot");
    svg.appendChild(circle);

    // Trigger animation
    requestAnimationFrame(() => {
      path.style.strokeDashoffset = "0";
    });

    // Cleanup after animation
    setTimeout(() => {
      path.classList.add("stats-map__arc--fade");
      text.classList.add("stats-map__city-label--fade");
      circle.classList.add("stats-map__origin-dot--fade");
    }, 1500);

    setTimeout(() => {
      path.remove();
      text.remove();
      circle.remove();
    }, 3500);
  }, []);

  useImperativeHandle(ref, () => ({
    addArc(event: RequestEvent) {
      drawArc(event.lat, event.lng, event.city_name);
    },
  }), [drawArc]);

  return <div ref={containerRef} className="stats-map__container" />;
});

export default StatsMap;
