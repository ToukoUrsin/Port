const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export interface RequestEvent {
  timestamp: string;
  method: string;
  path: string;
  ip?: string;
  profile_id?: string;
  status_code: number;
  lat: number;
  lng: number;
  city_name: string;
}

export interface ActiveUserInfo {
  profile_id: string;
  display_name: string;
  last_seen_ago: string;
}

export interface PathCount {
  path: string;
  count: number;
}

export interface StatsSnapshot {
  requests_per_minute: number;
  requests_today: number;
  active_user_count: number;
  active_users: ActiveUserInfo[] | null;
  top_paths: PathCount[] | null;
}

export interface StatsStreamCallbacks {
  onSnapshot: (snapshot: StatsSnapshot) => void;
  onRequest: (event: RequestEvent) => void;
  onError: (message: string) => void;
}

export function streamAdminStats(
  accessToken: string,
  callbacks: StatsStreamCallbacks,
): AbortController {
  const controller = new AbortController();

  (async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/stats/stream`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "text/event-stream",
        },
        credentials: "include",
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        callbacks.onError(`Stream failed: ${res.status} ${res.statusText}`);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let currentEvent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);
              switch (currentEvent) {
                case "snapshot":
                  callbacks.onSnapshot(parsed as StatsSnapshot);
                  break;
                case "request":
                  callbacks.onRequest(parsed as RequestEvent);
                  break;
              }
            } catch {
              // ignore malformed JSON
            }
            currentEvent = "";
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        callbacks.onError(
          (err as Error).message || "Stream connection failed",
        );
      }
    }
  })();

  return controller;
}
