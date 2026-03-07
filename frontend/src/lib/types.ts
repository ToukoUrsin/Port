// API types mirroring Go backend structs

export interface Block {
  type: string;
  content?: string;
  src?: string;
  caption?: string;
  alt?: string;
  level?: number;
  author?: string;
}

export interface ReviewFlag {
  type: string;
  text: string;
  suggestion: string;
}

export interface ReviewResult {
  score: number;
  flags: ReviewFlag[];
  approved: boolean;
}

export interface SubmissionMeta {
  blocks?: Block[];
  review?: ReviewResult;
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
  article: ApiSubmission;
  review: ReviewResult;
}

export interface SSEErrorEvent {
  step: string;
  message: string;
}

export interface SearchResponse {
  submissions?: ApiSubmission[];
  profiles?: ApiProfile[];
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

export interface DisplayArticle {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  timeAgo: string;
  image: string;
  isLead?: boolean;
  body?: string;
}

function tagsToCategory(tags: number): string {
  for (const [name, bit] of Object.entries(TagBits)) {
    if (tags & bit) return name;
  }
  return "community";
}

function timeAgo(dateStr: string): string {
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

export function apiSubmissionToDisplay(
  s: ApiSubmission,
  isLead?: boolean
): DisplayArticle {
  return {
    id: s.id,
    title: s.title,
    excerpt: s.description || s.meta.summary || "",
    category: s.meta.category || tagsToCategory(s.tags),
    author: s.owner_id.slice(0, 8),
    timeAgo: timeAgo(s.created_at),
    image: s.meta.featured_img || "",
    isLead,
    body: s.meta.blocks?.map((b) => b.content).join("\n\n"),
  };
}
