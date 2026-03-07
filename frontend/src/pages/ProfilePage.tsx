import { useState, useCallback, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { User, ImageIcon, FileText, Loader2, Settings } from "lucide-react";
import Navbar from "@/components/Navbar";
import BottomBar from "@/components/BottomBar";
import AccountSettings from "@/components/AccountSettings";
import { BADGE_CLASS, type Article } from "@/data/articles";
import { useAuth } from "@/contexts/AuthContext";
import { useApi } from "@/hooks/useApi";
import { getArticles, getProfileBySlug, getSubmissions } from "@/lib/api";
import { apiToArticle, timeAgo, SubmissionStatus } from "@/lib/types";
import type { ApiProfile, ApiSubmission } from "@/lib/types";
import "./ProfilePage.css";

function PostItem({ post, isDraft }: { post: Article; isDraft?: boolean }) {
  const inner = (
    <>
      <div className="profile-post__img">
        {post.image ? (
          <img src={post.image} alt={post.title} />
        ) : (
          <div className="profile-post__img-placeholder">
            <ImageIcon size={20} />
          </div>
        )}
      </div>
      <div className="profile-post__body">
        <div className="profile-post__meta">
          <span className={`badge ${BADGE_CLASS[post.category]}`}>{post.category}</span>
          {isDraft && <span className="profile-draft-badge">Draft</span>}
          <span>{post.timeAgo}</span>
        </div>
        <h3 className="profile-post__title">{post.title}</h3>
        <p className="profile-post__excerpt">{post.excerpt}</p>
      </div>
    </>
  );

  if (isDraft) {
    return <div className="profile-post">{inner}</div>;
  }

  return (
    <Link
      to={`/article/${post.id}`}
      className="profile-post"
      style={{ textDecoration: "none", color: "inherit" }}
    >
      {inner}
    </Link>
  );
}

function submissionToArticle(s: ApiSubmission): Article {
  return {
    ...apiToArticle(s),
    timeAgo: timeAgo(s.updated_at),
  };
}

export default function ProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const [tab, setTab] = useState<"posts" | "drafts" | "settings">("posts");
  const { user } = useAuth();
  const isOwnProfile = !slug;

  // Fetch profile for other users
  const fetchProfile = useCallback(
    () => slug ? getProfileBySlug(slug) : Promise.resolve(null),
    [slug],
  );
  const { data: otherProfile, isLoading: profileLoading, error: profileError } = useApi<ApiProfile | null>(fetchProfile, [slug]);

  const profile: ApiProfile | null = isOwnProfile ? user : otherProfile;
  const profileId = profile?.id;

  // Fetch published articles for this profile
  const fetchArticles = useCallback(
    () => profileId ? getArticles({ owner_id: profileId, limit: 100 }) : Promise.resolve({ articles: [], total: 0 }),
    [profileId],
  );
  const { data: articlesData, isLoading: articlesLoading } = useApi(fetchArticles, [profileId]);
  const publishedPosts = useMemo(
    () => (articlesData?.articles ?? []).map(apiToArticle),
    [articlesData],
  );

  // Fetch drafts for own profile only
  const fetchDrafts = useCallback(
    () => isOwnProfile ? getSubmissions() : Promise.resolve([]),
    [isOwnProfile],
  );
  const { data: allSubmissions } = useApi<ApiSubmission[]>(fetchDrafts, [isOwnProfile]);
  const drafts = useMemo(
    () => (allSubmissions ?? [])
      .filter((s) => s.status !== SubmissionStatus.Published)
      .map(submissionToArticle),
    [allSubmissions],
  );

  const items = tab === "posts" ? publishedPosts : tab === "drafts" ? drafts : [];

  if (!isOwnProfile && profileLoading) {
    return (
      <>
        <Navbar />
        <main className="profile-container" style={{ textAlign: "center", paddingTop: "var(--space-16)" }}>
          <Loader2 size={32} className="animate-spin" style={{ color: "var(--color-text-tertiary)" }} />
        </main>
        <BottomBar />
      </>
    );
  }

  if (!isOwnProfile && (profileError || !profile)) {
    return (
      <>
        <Navbar />
        <main className="profile-container" style={{ textAlign: "center", paddingTop: "var(--space-16)" }}>
          <User size={48} style={{ color: "var(--color-text-tertiary)", marginBottom: "var(--space-4)" }} />
          <h1 className="profile-name">Profile not found</h1>
          <p style={{ color: "var(--color-text-secondary)", marginTop: "var(--space-2)" }}>
            This profile doesn't exist or is private.
          </p>
          <Link to="/" className="btn btn-primary" style={{ marginTop: "var(--space-6)", display: "inline-flex" }}>
            Back to home
          </Link>
        </main>
        <BottomBar />
      </>
    );
  }

  const name = profile?.profile_name ?? "Anonymous";
  const email = profile?.email ?? "";
  const joined = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "";

  return (
    <>
      <Navbar />

      <main className="profile-container">
        <div className="profile-header">
          <div className="profile-avatar">
            <User size={32} />
          </div>
          <div className="profile-info">
            <h1 className="profile-name">{name}</h1>
            {isOwnProfile && email && <span className="profile-email">{email}</span>}
            {joined && <span className="profile-joined">Joined {joined}</span>}
          </div>
        </div>

        <div className="profile-stats">
          <div className="profile-stat">
            <span className="profile-stat__value">{publishedPosts.length}</span>
            <span className="profile-stat__label">Published</span>
          </div>
          {isOwnProfile && (
            <div className="profile-stat">
              <span className="profile-stat__value">{drafts.length}</span>
              <span className="profile-stat__label">Drafts</span>
            </div>
          )}
        </div>

        <div className="profile-tabs">
          <button
            className={`profile-tab ${tab === "posts" ? "profile-tab--active" : ""}`}
            onClick={() => setTab("posts")}
          >
            Published
          </button>
          {isOwnProfile && (
            <button
              className={`profile-tab ${tab === "drafts" ? "profile-tab--active" : ""}`}
              onClick={() => setTab("drafts")}
            >
              Drafts
            </button>
          )}
          {isOwnProfile && (
            <button
              className={`profile-tab ${tab === "settings" ? "profile-tab--active" : ""}`}
              onClick={() => setTab("settings")}
            >
              <Settings size={14} style={{ marginRight: "var(--space-1)", verticalAlign: "-2px" }} />
              Settings
            </button>
          )}
        </div>

        {tab === "settings" ? (
          <AccountSettings />
        ) : articlesLoading ? (
          <div style={{ textAlign: "center", padding: "var(--space-8)", color: "var(--color-text-tertiary)" }}>
            <Loader2 size={24} className="animate-spin" />
          </div>
        ) : items.length > 0 ? (
          <div className="profile-posts">
            {items.map((post) => (
              <PostItem key={post.id} post={post} isDraft={tab === "drafts"} />
            ))}
          </div>
        ) : (
          <div className="profile-empty">
            <div className="profile-empty__icon">
              <FileText size={32} />
            </div>
            <p className="profile-empty__text">
              {tab === "posts" ? "No published posts yet" : "No drafts yet"}
            </p>
          </div>
        )}
      </main>
      <BottomBar />
    </>
  );
}
