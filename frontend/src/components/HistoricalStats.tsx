import { useEffect, useState, useCallback } from "react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { getStatsHistory, getStatsLocations, getStatsSummary } from "@/lib/api";
import type {
  StatsHourlyRow,
  StatsLocationRow,
  StatsSummary,
} from "@/lib/adminStats";
import "./HistoricalStats.css";

type Period = 1 | 7 | 30 | 90;

interface AggregatedLocation {
  city_name: string;
  request_count: number;
}

export default function HistoricalStats() {
  const [period, setPeriod] = useState<Period>(7);
  const [hourlyData, setHourlyData] = useState<StatsHourlyRow[]>([]);
  const [locations, setLocations] = useState<StatsLocationRow[]>([]);
  const [summary, setSummary] = useState<StatsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async (days: Period) => {
    setLoading(true);
    try {
      const [history, locs, sum] = await Promise.all([
        getStatsHistory(days),
        getStatsLocations(days),
        getStatsSummary(days),
      ]);
      setHourlyData(history ? [...history].reverse() : []);
      setLocations(locs || []);
      setSummary(sum);
    } catch {
      // Keep previous data on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(period);
  }, [period, fetchData]);

  const formatXAxis = (value: string) => {
    if (!value) return "";
    const d = new Date(value);
    if (period === 1) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  // Aggregate locations by city (sum across days)
  const aggregatedLocations: AggregatedLocation[] = (() => {
    const map = new Map<string, number>();
    for (const loc of locations) {
      map.set(loc.city_name, (map.get(loc.city_name) || 0) + loc.request_count);
    }
    return Array.from(map.entries())
      .map(([city_name, request_count]) => ({ city_name, request_count }))
      .sort((a, b) => b.request_count - a.request_count)
      .slice(0, 15);
  })();

  const periods: Period[] = [1, 7, 30, 90];
  const periodLabels: Record<Period, string> = { 1: "1D", 7: "7D", 30: "30D", 90: "90D" };

  const hasData = hourlyData.length > 0;

  return (
    <div className="historical-stats">
      <div className="historical-stats__header">
        <h3 className="historical-stats__title">Historical Analytics</h3>
        <div className="historical-stats__periods">
          {periods.map((p) => (
            <button
              key={p}
              className={`historical-stats__period${period === p ? " historical-stats__period--active" : ""}`}
              onClick={() => setPeriod(p)}
            >
              {periodLabels[p]}
            </button>
          ))}
        </div>
      </div>

      {loading && !hasData ? (
        <div className="historical-stats__loading">Loading historical data...</div>
      ) : !hasData ? (
        <div className="historical-stats__empty">No historical data yet</div>
      ) : (
        <>
          {summary && (
            <div className="historical-stats__summary">
              <div className="historical-stats__summary-card">
                <span className="historical-stats__summary-value">
                  {summary.total_requests.toLocaleString()}
                </span>
                <span className="historical-stats__summary-label">Total Requests</span>
              </div>
              <div className="historical-stats__summary-card">
                <span className="historical-stats__summary-value">
                  {summary.max_peak_rpm.toLocaleString()}
                </span>
                <span className="historical-stats__summary-label">Peak RPM</span>
              </div>
              <div className="historical-stats__summary-card">
                <span className="historical-stats__summary-value">
                  {summary.total_unique_ips.toLocaleString()}
                </span>
                <span className="historical-stats__summary-label">Unique Visitors</span>
              </div>
              <div className="historical-stats__summary-card">
                <span className="historical-stats__summary-value">
                  {summary.unique_locations.toLocaleString()}
                </span>
                <span className="historical-stats__summary-label">Unique Locations</span>
              </div>
            </div>
          )}

          <div className="historical-stats__charts">
            <div className="historical-stats__chart">
              <h4 className="historical-stats__chart-title">Request Trend</h4>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={hourlyData}>
                  <XAxis dataKey="hour" tickFormatter={formatXAxis} tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} width={40} />
                  <Tooltip
                    labelFormatter={(v) => new Date(v as string).toLocaleString()}
                    formatter={(v: number) => [v.toLocaleString(), "Requests"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="request_count"
                    stroke="#386641"
                    fill="#386641"
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="historical-stats__chart">
              <h4 className="historical-stats__chart-title">Peak RPM</h4>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={hourlyData}>
                  <XAxis dataKey="hour" tickFormatter={formatXAxis} tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} width={40} />
                  <Tooltip
                    labelFormatter={(v) => new Date(v as string).toLocaleString()}
                    formatter={(v: number) => [v.toLocaleString(), "RPM"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="peak_rpm"
                    stroke="#8A7A2B"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="historical-stats__chart">
              <h4 className="historical-stats__chart-title">Unique Visitors</h4>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={hourlyData}>
                  <XAxis dataKey="hour" tickFormatter={formatXAxis} tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} width={40} />
                  <Tooltip
                    labelFormatter={(v) => new Date(v as string).toLocaleString()}
                    formatter={(v: number) => [v.toLocaleString(), "IPs"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="unique_ips"
                    stroke="#4A7A6A"
                    fill="#4A7A6A"
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="historical-stats__chart">
              <h4 className="historical-stats__chart-title">Top Locations</h4>
              {aggregatedLocations.length === 0 ? (
                <div className="historical-stats__empty">No location data</div>
              ) : (
                <div className="historical-stats__locations">
                  <div className="historical-stats__loc-header">
                    <span className="historical-stats__loc-city">City</span>
                    <span className="historical-stats__loc-count">Requests</span>
                  </div>
                  {aggregatedLocations.map((loc) => (
                    <div key={loc.city_name} className="historical-stats__loc-row">
                      <span className="historical-stats__loc-city">{loc.city_name}</span>
                      <span className="historical-stats__loc-count">
                        {loc.request_count.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
