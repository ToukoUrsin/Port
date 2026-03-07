import { useState, useCallback, useMemo } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { User, ImageIcon, FileText, Loader2, LogOut, PenSquare } from "lucide-react";
import Navbar from "@/components/Navbar";
import BottomBar from "@/components/BottomBar";
import AccountSettings from "@/components/AccountSettings";
import { BADGE_CLASS, type Article } from "@/data/articles";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useApi } from "@/hooks/useApi";
import { getArticles, getProfileBySlug, getSubmissions } from "@/lib/api";
import { apiToArticle, timeAgo, SubmissionStatus } from "@/lib/types";
import type { ApiProfile, ApiSubmission } from "@/lib/types";
import "./ProfilePage.css";

const STATUS_LABEL: Record<number, string> = {
  [SubmissionStatus.Draft]: "Draft",
  [SubmissionStatus.Transcribing]: "Processing",
  [SubmissionStatus.Generating]: "Processing",
  [SubmissionStatus.Reviewing]: "Processing",
  [SubmissionStatus.Ready]: "Ready",
  [SubmissionStatus.Refining]: "Refining",
  [SubmissionStatus.Appealed]: "In review",
  [SubmissionStatus.Archived]: "Archived",
};

function PostItem({ post, status }: { post: Article; status?: number }) {
  const isDraft = status !== undefined;
  const label = status !== undefined ? STATUS_LABEL[status] ?? "Draft" : null;
  const isReady = status === SubmissionStatus.Ready;

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
          {label && (
            <span className={`profile-draft-badge ${isReady ? "profile-draft-badge--ready" : ""}`}>
              {label}
            </span>
          )}
          <span>{post.timeAgo}</span>
        </div>
        <h3 className="profile-post__title">{post.title || "Untitled"}</h3>
        <p className="profile-post__excerpt">{post.excerpt}</p>
      </div>
    </>
  );

  // Drafts link to the article view (owner can see their own); published articles too
  if (isDraft && !post.title) {
    return <div className="profile-post profile-post--disabled">{inner}</div>;
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

type DraftArticle = Article & { status: number };

function submissionToDraft(s: ApiSubmission): DraftArticle {
  return {
    ...apiToArticle(s),
    timeAgo: timeAgo(s.updated_at),
    status: s.status,
  };
}

export default function ProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const [tab, setTab] = useState<"posts" | "drafts" | "settings">("posts");
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
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
    () => (articlesData?.articles ?? []).map((s) => apiToArticle(s, t)),
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
      .map(submissionToDraft),
    [allSubmissions],
  );

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

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
          <h1 className="profile-name">{t("profile.notFound")}</h1>
          <p style={{ color: "var(--color-text-secondary)", marginTop: "var(--space-2)" }}>
            {t("profile.notFoundDesc")}
          </p>
          <Link to="/" className="btn btn-primary" style={{ marginTop: "var(--space-6)", display: "inline-flex" }}>
            {t("profile.backHome")}
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
            {joined && <span className="profile-joined">{t("profile.joined")} {joined}</span>}
          </div>
          {isOwnProfile && (
            <button className="profile-logout" onClick={handleLogout}>
              <LogOut size={16} />
              <span>Log out</span>
            </button>
          )}
        </div>

        <div className="profile-stats">
          <div className="profile-stat">
            <span className="profile-stat__value">{publishedPosts.length}</span>
            <span className="profile-stat__label">{t("profile.published")}</span>
          </div>
          {isOwnProfile && (
            <div className="profile-stat">
              <span className="profile-stat__value">{drafts.length}</span>
              <span className="profile-stat__label">{t("profile.drafts")}</span>
            </div>
          )}
        </div>

        <div className="profile-tabs">
          <button
            className={`profile-tab ${tab === "posts" ? "profile-tab--active" : ""}`}
            onClick={() => setTab("posts")}
          >
            {t("profile.published")}
          </button>
          {isOwnProfile && (
            <button
              className={`profile-tab ${tab === "drafts" ? "profile-tab--active" : ""}`}
              onClick={() => setTab("drafts")}
            >
              {t("profile.drafts")}
            </button>
          )}
          {isOwnProfile && (
            <button
              className={`profile-tab ${tab === "settings" ? "profile-tab--active" : ""}`}
              onClick={() => setTab("settings")}
            >
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
        ) : tab === "posts" && publishedPosts.length > 0 ? (
          <div className="profile-posts">
            {publishedPosts.map((post) => (
              <PostItem key={post.id} post={post} />
            ))}
          </div>
        ) : tab === "drafts" && drafts.length > 0 ? (
          <div className="profile-posts">
            {drafts.map((d) => (
              <PostItem key={d.id} post={d} status={d.status} />
            ))}
          </div>
        ) : (
          <div className="profile-empty">
            <div className="profile-empty__icon">
              {tab === "posts" ? <FileText size={32} /> : <PenSquare size={32} />}
            </div>
            <p className="profile-empty__text">
              {tab === "posts" ? t("profile.noPosts") : t("profile.noDrafts")}
            </p>
            {isOwnProfile && (
              <Link to="/post" className="profile-empty__cta">
                Write your first story
              </Link>
            )}
          </div>
        )}
      </main>
      <BottomBar />
    </>
  );
}
