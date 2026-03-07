import type {
  AuthResponse,
  ArticleListResponse,
  ApiSubmission,
  SubmissionCreateResponse,
  SearchResponse,
  ApiProfile,
  ApiLocation,
  ApiReply,
  Coaching,
  RedTrigger,
} from "@/lib/types.ts";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Token stored in memory only (never localStorage) per AUTH_SPEC
let currentToken: string | null = null;

export function setToken(token: string | null) {
  currentToken = token;
}

export function getToken(): string | null {
  return currentToken;
}

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export { ApiError };

async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { access_token: string };
    currentToken = data.access_token;
    return currentToken;
  } catch {
    return null;
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (currentToken) {
    headers.set("Authorization", `Bearer ${currentToken}`);
  }
  // Don't set Content-Type for FormData (browser sets multipart boundary)
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  // Auto-refresh on 401
  if (res.status === 401 && currentToken) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers.set("Authorization", `Bearer ${newToken}`);
      res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
        credentials: "include",
      });
    }
  }

  if (!res.ok) {
    let msg = res.statusText;
    try {
      const body = await res.json();
      msg = body.error || body.message || msg;
    } catch {
      // ignore parse errors
    }
    throw new ApiError(res.status, msg);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

// --- Auth endpoints ---

export function login(
  email: string,
  password: string,
): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function register(
  email: string,
  password: string,
  display_name: string,
): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, display_name }),
  });
}

export function refreshToken(): Promise<{ access_token: string }> {
  return apiFetch<{ access_token: string }>("/api/auth/refresh", {
    method: "POST",
  });
}

export async function logout(): Promise<void> {
  await apiFetch<void>("/api/auth/logout", { method: "POST" });
  currentToken = null;
}

// --- Auth config ---

export function getAuthConfig(): Promise<{ google_enabled: boolean }> {
  return apiFetch<{ google_enabled: boolean }>("/api/auth/config");
}

// --- Article endpoints ---

export function getArticles(params?: {
  location_id?: string;
  category?: string;
  owner_id?: string;
  limit?: number;
  offset?: number;
}): Promise<ArticleListResponse> {
  const qs = new URLSearchParams();
  if (params?.location_id) qs.set("location_id", params.location_id);
  if (params?.category) qs.set("category", params.category);
  if (params?.owner_id) qs.set("owner_id", params.owner_id);
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));
  const query = qs.toString();
  return apiFetch<ArticleListResponse>(
    `/api/articles${query ? `?${query}` : ""}`,
  );
}

export function getArticle(id: string): Promise<ApiSubmission> {
  return apiFetch<ApiSubmission>(`/api/articles/${id}`);
}

// --- Submission endpoints ---

export function createSubmission(
  formData: FormData,
): Promise<SubmissionCreateResponse> {
  return apiFetch<SubmissionCreateResponse>("/api/submissions", {
    method: "POST",
    body: formData,
  });
}

export function getSubmission(id: string): Promise<ApiSubmission> {
  return apiFetch<ApiSubmission>(`/api/submissions/${id}`);
}

export type GateRejection = {
  error: "gate_red";
  gate: "RED";
  coaching: Coaching;
  red_triggers: RedTrigger[];
};

export async function publishArticle(
  id: string,
): Promise<{ status: string } | GateRejection> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token = currentToken;
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/api/submissions/${id}/publish`, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify({}),
  });

  if (res.status === 422) {
    return res.json() as Promise<GateRejection>;
  }

  if (!res.ok) {
    let msg = res.statusText;
    try {
      const body = await res.json();
      msg = body.error || body.message || msg;
    } catch {
      // ignore parse errors
    }
    throw new ApiError(res.status, msg);
  }

  return res.json();
}

export async function refineSubmission(
  id: string,
  data: FormData | { text_note: string },
): Promise<{ status: string }> {
  if (data instanceof FormData) {
    return apiFetch<{ status: string }>(`/api/submissions/${id}/refine`, {
      method: "POST",
      body: data,
    });
  }
  return apiFetch<{ status: string }>(`/api/submissions/${id}/refine`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function appealSubmission(
  id: string,
): Promise<{ status: string }> {
  return apiFetch<{ status: string }>(`/api/submissions/${id}/appeal`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

// --- Location endpoints ---

export function getLocations(): Promise<{ locations: ApiLocation[] }> {
  return apiFetch<{ locations: ApiLocation[] }>("/api/locations");
}

export function getLocation(slug: string): Promise<ApiLocation> {
  return apiFetch<ApiLocation>(`/api/locations/${slug}`);
}

export function getLocationArticles(
  slug: string,
): Promise<{ articles: ApiSubmission[] }> {
  return apiFetch<{ articles: ApiSubmission[] }>(
    `/api/locations/${slug}/articles`,
  );
}

// --- Search ---

export function search(params: {
  q: string;
  type?: string;
  location_id?: string;
  limit?: number;
  offset?: number;
}): Promise<SearchResponse> {
  const qs = new URLSearchParams();
  qs.set("q", params.q);
  if (params.type) qs.set("type", params.type);
  if (params.location_id) qs.set("location_id", params.location_id);
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.offset) qs.set("offset", String(params.offset));
  return apiFetch<SearchResponse>(`/api/search?${qs.toString()}`);
}

// --- Profile ---

export function getProfile(): Promise<ApiProfile> {
  return apiFetch<ApiProfile>("/api/profiles/me");
}

export function getProfileBySlug(slug: string): Promise<ApiProfile> {
  return apiFetch<ApiProfile>(`/api/profiles/${encodeURIComponent(slug)}`);
}

export function updateProfile(
  id: string,
  data: Partial<ApiProfile>,
): Promise<ApiProfile> {
  return apiFetch<ApiProfile>(`/api/profiles/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

// --- Replies ---

export function getReplies(
  articleId: string,
): Promise<{ replies: ApiReply[] }> {
  return apiFetch<{ replies: ApiReply[] }>(
    `/api/articles/${articleId}/replies`,
  );
}

export function createReply(
  submissionId: string,
  body: string,
  parentId?: string,
): Promise<ApiReply> {
  return apiFetch<ApiReply>(`/api/submissions/${submissionId}/replies`, {
    method: "POST",
    body: JSON.stringify({ body, parent_id: parentId }),
  });
}

// --- Submissions (for profile drafts) ---

export async function getSubmissions(): Promise<ApiSubmission[]> {
  const res = await apiFetch<{ submissions: ApiSubmission[]; total: number }>("/api/submissions");
  return res.submissions;
}
