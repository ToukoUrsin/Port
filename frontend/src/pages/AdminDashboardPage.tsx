import { useEffect, useRef, useState } from "react";
import { getToken } from "@/lib/api";
import {
  streamAdminStats,
  type StatsSnapshot,
  type RequestEvent,
} from "@/lib/adminStats";
import StatsMap, { type StatsMapHandle } from "@/components/StatsMap";
import StatsCards from "@/components/StatsCards";
import ActiveUsersList from "@/components/ActiveUsersList";
import Navbar from "@/components/Navbar";
import "./AdminDashboardPage.css";

export default function AdminDashboardPage() {
  const mapRef = useRef<StatsMapHandle>(null);
  const [snapshot, setSnapshot] = useState<StatsSnapshot | null>(null);
  const [recentRequests, setRecentRequests] = useState<RequestEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setError("Not authenticated");
      return;
    }

    const controller = streamAdminStats(token, {
      onSnapshot(snap) {
        setSnapshot(snap);
        setError(null);
      },
      onRequest(event) {
        mapRef.current?.addArc(event);
        setRecentRequests((prev) => [event, ...prev].slice(0, 100));
      },
      onError(msg) {
        setError(msg);
      },
    });

    return () => controller.abort();
  }, []);

  return (
    <>
      <Navbar />
      <div className="admin-dashboard">
        <div className="admin-dashboard__map">
          <StatsMap ref={mapRef} />
          {error && (
            <div className="admin-dashboard__error">{error}</div>
          )}
        </div>

        <div className="admin-dashboard__panels">
          <div className="admin-dashboard__stats">
            <StatsCards snapshot={snapshot} />
          </div>
          <div className="admin-dashboard__users">
            <ActiveUsersList users={snapshot?.active_users ?? null} />
          </div>
        </div>

        <div className="admin-dashboard__feed">
          <h3 className="admin-dashboard__feed-title">Recent Requests</h3>
          <div className="admin-dashboard__feed-list">
            {recentRequests.length === 0 ? (
              <p className="admin-dashboard__feed-empty">
                Waiting for traffic...
              </p>
            ) : (
              recentRequests.slice(0, 20).map((req, i) => (
                <div key={i} className="admin-dashboard__feed-item">
                  <span
                    className={`admin-dashboard__method admin-dashboard__method--${req.method.toLowerCase()}`}
                  >
                    {req.method}
                  </span>
                  <span className="admin-dashboard__path">{req.path}</span>
                  <span className="admin-dashboard__city">
                    {req.city_name}
                  </span>
                  <span className="admin-dashboard__status">
                    {req.status_code}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
