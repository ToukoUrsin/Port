// API types mirroring Go backend structs

// --- Review types (matches PROMPTS_SPEC.md canonical schema) ---

export interface VerificationEntry {
  claim: string;
  evidence: string;
  status:
    | "SUPPORTED"
    | "NOT_IN_SOURCE"
    | "POSSIBLE_HALLUCINATION"
    | "FABRICATED_QUOTE";
}

export interface QualityScores {
  evidence: number;
  perspectives: number;
  representation: number;
  ethical_framing: number;
  cultural_context: number;
  manipulation: number;
}

export interface RedTrigger {
  dimension: string;
  trigger: string;
  paragraph: number;
  sentence: string;
  fix_options: string[];
}

export interface YellowFlag {
  dimension: string;
  description: string;
  suggestion: string;
}

export interface Coaching {
  celebration: string;
  suggestions: string[];
}

export interface WebSource {
  title: string;
  url: string;
}

export interface ReviewResult {
  verification: VerificationEntry[];
  scores: QualityScores;
  gate: "GREEN" | "YELLOW" | "RED";
  red_triggers: RedTrigger[];
  yellow_flags: YellowFlag[];
  coaching: Coaching;
  web_sources?: WebSource[];
}

// --- Article metadata (from generation) ---

export interface ArticleMetadata {
  chosen_structure:
    | "news_report"
    | "feature"
    | "photo_essay"
    | "brief"
    | "narrative";
  category: string;
  confidence: number;
  missing_context: string[];
}

export interface ArticleVersion {
  article_markdown: string;
  metadata: ArticleMetadata;
  review: ReviewResult;
  contributor_input: string;
  timestamp: string;
}

// --- Submission ---

export interface SubmissionMeta {
  // New article engine fields
  article_markdown?: string;
  article_metadata?: ArticleMetadata;
  versions?: ArticleVersion[];
  transcript?: string;

  // Review (new shape)
  review?: ReviewResult;

  // Kept from before
  summary?: string;
  category?: string;
  model?: string;
  generated_at?: string;
  slug?: string;
  featured_img?: string;
  sources?: string[];
  event_date?: string;
  place_name?: string;
  published_at?: string;
  published_by?: string;
  flagged?: boolean;
  flag_reason?: string;
}

export interface ApiSubmission {
  id: string;
  owner_id: string;
  owner_name?: string;
  location_id: string;
  title: string;
  description: string;
  tags: number;
  status: number;
  error: number;
  views: number;
  share_count: number;
  lat?: number;
  lng?: number;
  reactions: Record<string, number>;
  meta: SubmissionMeta;
  created_at: string;
  updated_at: string;
}

export interface LocationMeta {
  area_km2?: number;
  timezone?: string;
  about?: string;
  highlights?: string[];
  population?: number;
  postal_code?: string;
  cover_image?: string;
  icon?: string;
}

export interface ApiLocation {
  id: string;
  name: string;
  slug: string;
  level: number;
  parent_id?: string;
  path: string;
  description?: string;
  is_active: boolean;
  lat?: number;
  lng?: number;
  article_count: number;
  submission_count: number;
  contributor_count: number;
  follower_count: number;
  last_activity_at?: string;
  trending_score: number;
  meta: LocationMeta;
  created_at: string;
  updated_at: string;
}

export interface ProfileMeta {
  first_name?: string;
  last_name?: string;
  avatar?: string;
  bio?: string;
  about?: string;
  occupation?: string;
  organization?: string;
  tags?: string[];
  phone?: string;
  website?: string;
  links?: Record<string, string>;
  last_login_at?: string;
  language?: string;
  notify_email?: boolean;
  notify_push?: boolean;
}

export interface ApiProfile {
  id: string;
  profile_name: string;
  email: string;
  location_id?: string;
  role: number;
  permissions: number;
  tags: number;
  public: boolean;
  is_adult: boolean;
  meta: ProfileMeta;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  access_token: string;
  profile: ApiProfile;
}

export interface ArticleListResponse {
  articles: ApiSubmission[];
  total: number;
}

export interface SubmissionCreateResponse {
  submission_id: string;
  status: string;
}

export interface SSEStatusEvent {
  step: string;
  message: string;
}

export interface SSECompleteEvent {
  article: string;
  metadata: ArticleMetadata;
  review: ReviewResult;
}

export interface SSEErrorEvent {
  step: string;
  message: string;
}

export interface SearchResponse {
  session_id: string;
  mode: string;
  chunk: number;
  total_chunks: number;
  total_results: number;
  submissions: ApiSubmission[];
  profiles: ApiProfile[];
}

// --- Status constants matching Go backend ---

export const SubmissionStatus = {
  Draft: 0,
  Transcribing: 1,
  Generating: 2,
  Reviewing: 3,
  Ready: 4,
  Published: 5,
  Archived: 6,
  Refining: 7,
  Appealed: 8,
} as const;

// --- Tag bitmask constants ---

export const TagBits: Record<string, number> = {
  council: 1 << 0,
  schools: 1 << 1,
  business: 1 << 2,
  events: 1 << 3,
  sports: 1 << 4,
  community: 1 << 5,
  culture: 1 << 6,
  safety: 1 << 7,
  health: 1 << 8,
  environment: 1 << 9,
};

// --- Display helpers ---

import type { Article } from "@/data/articles";

function tagsToCategory(tags: number): string {
  for (const [name, bit] of Object.entries(TagBits)) {
    if (tags & bit) return name;
  }
  return "community";
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}

export function apiToArticle(s: ApiSubmission): Article {
  const body = s.meta.article_markdown || s.description || "";

  return {
    id: s.id,
    title: s.title,
    excerpt: (s.meta.article_markdown || s.description || s.meta.summary || "").slice(0, 200),
    body,
    category: s.meta.category || tagsToCategory(s.tags),
    author: s.owner_name || s.owner_id.slice(0, 8),
    authorId: s.owner_id,
    timeAgo: timeAgo(s.created_at),
    image: s.meta.featured_img || "",
    area: s.meta.place_name,
  };
}

// --- Reply types ---

export interface ApiReply {
  id: string;
  submission_id: string;
  profile_id: string;
  parent_id?: string;
  body: string;
  status: number;
  created_at: string;
}
