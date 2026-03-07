import type {
  SSEStatusEvent,
  SSECompleteEvent,
  SSEErrorEvent,
} from "@/lib/types.ts";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export interface StreamCallbacks {
  onStatus: (event: SSEStatusEvent) => void;
  onComplete: (event: SSECompleteEvent) => void;
  onError: (event: SSEErrorEvent) => void;
}

/**
 * Stream pipeline progress via SSE using fetch + ReadableStream.
 * We use fetch instead of EventSource because we need the Authorization header.
 * Returns an AbortController so the caller can cancel the stream.
 */
export function streamPipeline(
  submissionId: string,
  accessToken: string,
  callbacks: StreamCallbacks,
): AbortController {
  const controller = new AbortController();

  (async () => {
    try {
      const res = await fetch(
        `${API_BASE}/api/submissions/${submissionId}/stream`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "text/event-stream",
          },
          credentials: "include",
          signal: controller.signal,
        },
      );

      if (!res.ok || !res.body) {
        callbacks.onError({
          step: "connection",
          message: `Stream failed: ${res.status} ${res.statusText}`,
        });
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
        // Keep the last potentially incomplete line in the buffer
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);
              switch (currentEvent) {
                case "status":
                  callbacks.onStatus(parsed as SSEStatusEvent);
                  break;
                case "complete":
                  callbacks.onComplete(parsed as SSECompleteEvent);
                  break;
                case "error":
                  callbacks.onError(parsed as SSEErrorEvent);
                  break;
              }
            } catch {
              // ignore malformed JSON
            }
            currentEvent = "";
          }
          // Empty line resets event, but we already handle per data line
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        callbacks.onError({
          step: "connection",
          message: (err as Error).message || "Stream connection failed",
        });
      }
    }
  })();

  return controller;
}
