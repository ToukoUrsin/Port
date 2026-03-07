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

export interface ResearchResult {
  context: string;
  sources: WebSource[];
  queries: string[];
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

  // Research context from pre-generation web search
  research?: ResearchResult;

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
  anonymous?: boolean;
}

export interface ApiSubmission {
  id: string;
  owner_id: string;
  owner_name?: string;
  location_id: string;
  location_name?: string;
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
  has_password?: boolean;
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

export interface SSEGatherData {
  transcript?: string;
  photo_descriptions?: string[];
  photo_urls?: string[];
  notes?: string;
}

export interface SSEResearchData {
  context: string;
  sources: WebSource[];
  queries: string[];
}

export interface SSEGeneratedData {
  structure: string;
  category: string;
  confidence: number;
  missing_context: string[];
  word_count: number;
}

export interface SSEReviewedData {
  gate: "GREEN" | "YELLOW" | "RED";
  scores: QualityScores;
  verified_claims: number;
  red_triggers: number;
  yellow_flags: number;
  coaching: Coaching;
  web_sources: number;
}

export interface SSEStatusEvent {
  step: string;
  message: string;
  data?: SSEGatherData | SSEResearchData | SSEGeneratedData | SSEReviewedData;
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
  Researching: 9,
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

// --- Quality score ---

const DIMENSION_WEIGHTS: Record<keyof QualityScores, number> = {
  evidence: 0.25,
  perspectives: 0.20,
  representation: 0.18,
  ethical_framing: 0.15,
  cultural_context: 0.12,
  manipulation: 0.10,
};

export function computeOverallScore(scores: QualityScores): number {
  let sum = 0;
  for (const [dim, weight] of Object.entries(DIMENSION_WEIGHTS)) {
    sum += (scores[dim as keyof QualityScores] ?? 0) * weight;
  }
  return Math.round(sum * 100);
}

// --- Display helpers ---

import type { Article } from "@/data/articles";

function tagsToCategory(tags: number): string {
  for (const [name, bit] of Object.entries(TagBits)) {
    if (tags & bit) return name;
  }
  return "community";
}

export function timeAgo(dateStr: string, t?: (key: string) => string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) {
    return t ? t("time.minutesAgo").replace("{n}", String(mins)) : `${mins}m ago`;
  }
  const hours = Math.floor(mins / 60);
  if (hours < 24) {
    return t ? t("time.hoursAgo").replace("{n}", String(hours)) : `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  if (days < 7) {
    return t ? t("time.daysAgo").replace("{n}", String(days)) : `${days}d ago`;
  }
  const weeks = Math.floor(days / 7);
  return t ? t("time.weeksAgo").replace("{n}", String(weeks)) : `${weeks}w ago`;
}

function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, "")       // headings
    .replace(/\*\*(.+?)\*\*/g, "$1")    // bold
    .replace(/\*(.+?)\*/g, "$1")        // italic
    .replace(/__(.+?)__/g, "$1")        // bold alt
    .replace(/_(.+?)_/g, "$1")          // italic alt
    .replace(/~~(.+?)~~/g, "$1")        // strikethrough
    .replace(/`(.+?)`/g, "$1")          // inline code
    .replace(/^\s*[-*+]\s+/gm, "")     // unordered lists
    .replace(/^\s*\d+\.\s+/gm, "")     // ordered lists
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // links
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1") // images
    .replace(/^\s*>\s+/gm, "")         // blockquotes
    .replace(/\n{2,}/g, " ")           // collapse double newlines
    .replace(/\n/g, " ")               // remaining newlines
    .trim();
}

export function apiToArticle(s: ApiSubmission, t?: (key: string) => string): Article {
  const body = s.meta.article_markdown || s.description || "";

  return {
    id: s.id,
    title: s.title,
    excerpt: stripMarkdown(s.meta.article_markdown || s.description || s.meta.summary || "").slice(0, 200),
    body,
    category: s.meta.category || tagsToCategory(s.tags),
    author: s.meta.anonymous ? "Anonymous contributor" : (s.owner_name || s.owner_id?.slice(0, 8) || "Anonymous"),
    authorId: s.owner_id,
    timeAgo: timeAgo(s.created_at, t),
    image: s.meta.featured_img || "",
    area: s.location_name || s.meta.place_name,
  };
}

// --- Reply types ---

export interface ReplyMeta {
  reactions?: Record<string, number>;
  edited_at?: string;
}

export interface ApiReply {
  id: string;
  submission_id: string;
  profile_id: string;
  parent_id?: string;
  body: string;
  status: number;
  meta?: ReplyMeta;
  created_at: string;
}

// --- Reaction types ---

export interface ReactionCounts {
  likes: number;
  dislikes: number;
  user_reaction?: number; // 1 = like, -1 = dislike, 0 = none
}

export interface ReplyReactionMap {
  [replyId: string]: {
    likes?: number;
    user_liked?: number;
  };
}

export interface FollowStatus {
  following: boolean;
  follow_id?: string;
}

export interface FollowCounts {
  followers: number;
  following: number;
}
