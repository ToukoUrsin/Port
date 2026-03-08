import { MapPin, Tag, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import "./FilterChips.css";

export interface FilterChip {
  type: "location" | "category";
  id: string;
  label: string;
}

interface FilterChipsProps {
  chips: FilterChip[];
  onRemove: (chip: FilterChip) => void;
  onClearAll: () => void;
}

export default function FilterChips({ chips, onRemove, onClearAll }: FilterChipsProps) {
  const { t } = useLanguage();

  if (chips.length === 0) return null;

  return (
    <div className="filter-chips">
      <div className="filter-chips__scroll">
        {chips.map((chip) => (
          <span key={`${chip.type}-${chip.id}`} className="filter-chip">
            {chip.type === "category" ? <Tag size={14} /> : <MapPin size={14} />}
            <span>{chip.label}</span>
            <button
              className="filter-chip__dismiss"
              onClick={() => onRemove(chip)}
              aria-label={`Remove ${chip.label}`}
            >
              <X size={14} />
            </button>
          </span>
        ))}
        {chips.length > 1 && (
          <button className="filter-chips__clear" onClick={onClearAll}>
            {t("filter.clearAll")}
          </button>
        )}
      </div>
    </div>
  );
}
