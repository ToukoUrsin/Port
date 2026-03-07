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

    // SVG overlay — append to map container (NOT leaflet-map-pane)
    // so we can use container-relative coordinates
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.classList.add("stats-map__svg-overlay");
    map.getContainer().appendChild(svg);

    mapRef.current = map;
    svgRef.current = svg;

    return () => {
      map.remove();
      mapRef.current = null;
      svgRef.current = null;
    };
  }, []);

  const drawArc = useCallback(
    (fromLat: number, fromLng: number, cityName: string) => {
      const map = mapRef.current;
      const svg = svgRef.current;
      if (!map || !svg) return;

      const from = map.latLngToContainerPoint([fromLat, fromLng]);
      const to = map.latLngToContainerPoint(OTANIEMI);

      // If origin is the same point as destination (local), skip
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 5) return;

      // Quadratic bezier - arc curves upward
      const midX = (from.x + to.x) / 2;
      const midY = (from.y + to.y) / 2;
      const curveHeight = Math.min(dist * 0.35, 180);
      const nx = -dy / dist;
      const ny = dx / dist;
      const cx = midX + nx * curveHeight;
      const cy = midY + ny * curveHeight;

      // Group for easy cleanup
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.classList.add("stats-map__arc-group");

      // Pick a vibrant color
      const hue = Math.floor(Math.random() * 360);
      const color = `hsl(${hue}, 100%, 65%)`;
      g.style.setProperty("--arc-color", color);

      // Arc path
      const path = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path",
      );
      path.setAttribute(
        "d",
        `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`,
      );
      path.classList.add("stats-map__arc");
      // Must be in DOM to measure length
      g.appendChild(path);
      svg.appendChild(g);

      const length = path.getTotalLength();
      path.style.strokeDasharray = `${length}`;
      path.style.strokeDashoffset = `${length}`;

      // Origin dot
      const circle = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "circle",
      );
      circle.setAttribute("cx", String(from.x));
      circle.setAttribute("cy", String(from.y));
      circle.setAttribute("r", "4");
      circle.classList.add("stats-map__origin-dot");
      g.appendChild(circle);

      // City label
      const text = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "text",
      );
      text.setAttribute("x", String(from.x));
      text.setAttribute("y", String(from.y - 10));
      text.classList.add("stats-map__city-label");
      text.textContent = cityName;
      g.appendChild(text);

      // Impact dot at destination
      const impact = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "circle",
      );
      impact.setAttribute("cx", String(to.x));
      impact.setAttribute("cy", String(to.y));
      impact.setAttribute("r", "0");
      impact.classList.add("stats-map__impact-dot");
      g.appendChild(impact);

      // Animate: draw line over 2s
      requestAnimationFrame(() => {
        path.style.strokeDashoffset = "0";
      });

      // Impact ripple after line arrives
      setTimeout(() => {
        impact.setAttribute("r", "6");
        impact.classList.add("stats-map__impact-dot--ripple");
      }, 2000);

      // Start fading at 3.5s
      setTimeout(() => {
        g.classList.add("stats-map__arc-group--fade");
      }, 3500);

      // Remove from DOM at 5.5s
      setTimeout(() => {
        g.remove();
      }, 5500);
    },
    [],
  );

  useImperativeHandle(
    ref,
    () => ({
      addArc(event: RequestEvent) {
        drawArc(event.lat, event.lng, event.city_name);
      },
    }),
    [drawArc],
  );

  return <div ref={containerRef} className="stats-map__container" />;
});

export default StatsMap;
