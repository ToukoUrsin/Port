export interface Article {
  id: string;
  title: string;
  excerpt: string;
  body: string;
  category: string;
  author: string;
  authorId?: string;
  timeAgo: string;
  image: string;
  area?: string;
  isLead?: boolean;
}

export function authorSlug(name: string): string {
  return (name ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export const BADGE_CLASS: Record<string, string> = {
  council: "badge-council",
  schools: "badge-schools",
  business: "badge-business",
  events: "badge-events",
  sports: "badge-sports",
  community: "badge-community",
  opinion: "badge-opinion",
  news: "badge-news",
};
