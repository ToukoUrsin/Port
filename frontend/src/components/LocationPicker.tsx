import { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, ChevronDown, X } from "lucide-react";
import { getLocations } from "@/lib/api";
import type { ApiLocation } from "@/lib/types";
import "./LocationPicker.css";

const LEVEL_LABELS: Record<number, string> = {
  0: "Continent",
  1: "Country",
  2: "Region",
  3: "City",
};

interface LocationPickerProps {
  value: string; // location ID
  onChange: (id: string, name: string) => void;
  defaultName?: string;
  placeholder?: string;
}

export default function LocationPicker({
  value,
  onChange,
  defaultName,
  placeholder = "Where did this happen?",
}: LocationPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ApiLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedName, setSelectedName] = useState(defaultName || "");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Fetch on query change (debounced)
  useEffect(() => {
    if (!open) return;
    clearTimeout(debounceRef.current);

    if (!query.trim()) {
      // Show popular locations when empty
      setLoading(true);
      getLocations({ level: [3, 2], limit: 15 })
        .then((r) => setResults(r.locations))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
      return;
    }

    debounceRef.current = setTimeout(() => {
      setLoading(true);
      getLocations({ q: query.trim(), limit: 20 })
        .then((r) => setResults(r.locations))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 200);

    return () => clearTimeout(debounceRef.current);
  }, [query, open]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleSelect = useCallback(
    (loc: ApiLocation) => {
      onChange(loc.id, loc.name);
      setSelectedName(loc.name);
      setQuery("");
      setOpen(false);
    },
    [onChange],
  );

  const handleClear = useCallback(() => {
    onChange("", "");
    setSelectedName("");
    setQuery("");
  }, [onChange]);

  function buildPath(loc: ApiLocation): string {
    // path is like "europe/finland/uusimaa/helsinki"
    const parts = loc.path.split("/");
    // Remove the last part (it's the location itself) and capitalize rest
    const ancestors = parts.slice(0, -1).map((p) =>
      p.charAt(0).toUpperCase() + p.slice(1).replace(/-/g, " "),
    );
    return ancestors.join(" > ");
  }

  return (
    <div className="loc-picker" ref={containerRef}>
      {!open ? (
        <button
          type="button"
          className={`loc-picker-trigger ${value ? "loc-picker-trigger--set" : ""}`}
          onClick={() => {
            setOpen(true);
            setTimeout(() => inputRef.current?.focus(), 50);
          }}
        >
          <MapPin size={16} />
          <span className="loc-picker-value">
            {selectedName || placeholder}
          </span>
          {value ? (
            <span
              className="loc-picker-clear"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
            >
              <X size={14} />
            </span>
          ) : (
            <ChevronDown size={14} />
          )}
        </button>
      ) : (
        <div className="loc-picker-dropdown">
          <input
            ref={inputRef}
            type="text"
            className="loc-picker-input"
            placeholder="Search city, region, country..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setOpen(false);
            }}
          />
          <ul className="loc-picker-results">
            {loading && (
              <li className="loc-picker-empty">Searching...</li>
            )}
            {!loading && results.length === 0 && query && (
              <li className="loc-picker-empty">No locations found</li>
            )}
            {!loading &&
              results.map((loc) => (
                <li key={loc.id}>
                  <button
                    type="button"
                    className="loc-picker-option"
                    onClick={() => handleSelect(loc)}
                  >
                    <div className="loc-picker-option-main">
                      <MapPin size={14} />
                      <span className="loc-picker-option-name">{loc.name}</span>
                      <span className="loc-picker-option-level">
                        {LEVEL_LABELS[loc.level] || ""}
                      </span>
                    </div>
                    {loc.path && (
                      <span className="loc-picker-option-path">
                        {buildPath(loc)}
                      </span>
                    )}
                  </button>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}
