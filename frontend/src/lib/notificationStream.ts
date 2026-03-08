import type { ApiNotification } from "@/lib/types.ts";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export interface NotificationEvent {
  notification: ApiNotification;
  actor_name: string;
  article_title: string;
}

export interface NotificationStreamCallbacks {
  onNotification: (event: NotificationEvent) => void;
  onCount: (count: number) => void;
}

/**
 * Connect to the notification SSE stream.
 * Uses fetch (not EventSource) because we need the Authorization header.
 * Auto-reconnects with exponential backoff on connection drop.
 * Returns an AbortController to disconnect.
 */
export function connectNotificationStream(
  token: string,
  callbacks: NotificationStreamCallbacks,
): AbortController {
  const controller = new AbortController();
  let backoff = 1000;
  const maxBackoff = 30000;

  function connect() {
    if (controller.signal.aborted) return;

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/notifications/stream`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "text/event-stream",
          },
          credentials: "include",
          signal: controller.signal,
        });

        if (!res.ok || !res.body) return;

        // Reset backoff on successful connection
        backoff = 1000;

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
                  case "notification":
                    callbacks.onNotification(parsed as NotificationEvent);
                    break;
                  case "count":
                    callbacks.onCount((parsed as { count: number }).count);
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
        if ((err as Error).name === "AbortError") return;
      }

      // Reconnect with exponential backoff
      if (!controller.signal.aborted) {
        setTimeout(connect, backoff);
        backoff = Math.min(backoff * 2, maxBackoff);
      }
    })();
  }

  connect();
  return controller;
}
