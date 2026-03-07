import type { StatsSnapshot } from "@/lib/adminStats";
import { Activity, BarChart3, Users, Zap } from "lucide-react";
import "./StatsCards.css";

interface StatsCardsProps {
  snapshot: StatsSnapshot | null;
}

export default function StatsCards({ snapshot }: StatsCardsProps) {
  const rpm = snapshot?.requests_per_minute ?? 0;
  const today = snapshot?.requests_today ?? 0;
  const activeUsers = snapshot?.active_user_count ?? 0;
  const topPath = snapshot?.top_paths?.[0];

  return (
    <div className="stats-cards">
      <div className="stats-card">
        <div className="stats-card__icon">
          <Zap size={20} />
        </div>
        <div className="stats-card__content">
          <span className="stats-card__value">{rpm}</span>
          <span className="stats-card__label">req/min</span>
        </div>
      </div>

      <div className="stats-card">
        <div className="stats-card__icon">
          <BarChart3 size={20} />
        </div>
        <div className="stats-card__content">
          <span className="stats-card__value">{today.toLocaleString()}</span>
          <span className="stats-card__label">today</span>
        </div>
      </div>

      <div className="stats-card">
        <div className="stats-card__icon">
          <Users size={20} />
        </div>
        <div className="stats-card__content">
          <span className="stats-card__value">{activeUsers}</span>
          <span className="stats-card__label">active users</span>
        </div>
      </div>

      <div className="stats-card">
        <div className="stats-card__icon">
          <Activity size={20} />
        </div>
        <div className="stats-card__content">
          <span className="stats-card__value stats-card__value--path">
            {topPath ? topPath.path : "--"}
          </span>
          <span className="stats-card__label">
            top endpoint{topPath ? ` (${topPath.count})` : ""}
          </span>
        </div>
      </div>
    </div>
  );
}
