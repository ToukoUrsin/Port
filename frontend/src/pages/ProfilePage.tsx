import { useState, useCallback, useMemo, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { User, ImageIcon, FileText, Loader2, LogOut, PenSquare, UserPlus, UserCheck, Music, FolderOpen, Bell, ThumbsUp, ThumbsDown, MessageSquare, X, Bookmark } from "lucide-react";
import Navbar from "@/components/Navbar";
import BottomBar from "@/components/BottomBar";
import AccountSettings from "@/components/AccountSettings";
import { BADGE_CLASS, type Article } from "@/data/articles";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDocumentHead } from "@/hooks/useDocumentHead";
import { useApi } from "@/hooks/useApi";
import { getArticles, getProfileBySlug, getSubmissions, getMyFiles, fileToMediaUrl, getFollowStatus, getFollowCounts, followUser, unfollowUser, getNotifications, markAllNotificationsRead, markNotificationRead, getFollowers, getFollowing, getBookmarks } from "@/lib/api";
import ArticleCard from "@/components/ArticleCard";
import { apiToArticle, timeAgo, SubmissionStatus, FileType } from "@/lib/types";
import type { ApiProfile, ApiSubmission, FollowCounts, ApiFile, ApiNotification, FollowUser } from "@/lib/types";
import { NotifType, NotifTargetType } from "@/lib/types";
import "./ProfilePage.css";

function statusLabel(status: number, t: (key: string) => string): string {
  const map: Record<number, string> = {
    [SubmissionStatus.Draft]: t("profile.statusDraft"),
    [SubmissionStatus.Transcribing]: t("profile.statusProcessing"),
    [SubmissionStatus.Generating]: t("profile.statusProcessing"),
    [SubmissionStatus.Reviewing]: t("profile.statusProcessing"),
    [SubmissionStatus.Ready]: t("profile.statusReady"),
    [SubmissionStatus.Refining]: t("profile.statusRefining"),
    [SubmissionStatus.Appealed]: t("profile.statusInReview"),
    [SubmissionStatus.Archived]: t("profile.statusArchived"),
  };
  return map[status] ?? t("profile.statusDraft");
}

function PostItem({ post, status }: { post: Article; status?: number }) {
  const { t } = useLanguage();
  const isDraft = status !== undefined;
  const label = status !== undefined ? statusLabel(status, t) : null;
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
          <span className={`badge ${BADGE_CLASS[post.category]}`}>{t("tag." + post.category)}</span>
          {label && (
            <span className={`profile-draft-badge ${isReady ? "profile-draft-badge--ready" : ""}`}>
              {label}
            </span>
          )}
          <span>{post.timeAgo}</span>
        </div>
        <h3 className="profile-post__title">{post.title || t("profile.untitled")}</h3>
        <p className="profile-post__excerpt">{post.excerpt}</p>
      </div>
    </>
  );

  // Drafts without a title are not clickable
  if (isDraft && !post.title) {
    return <div className="profile-post profile-post--disabled">{inner}</div>;
  }

  // Drafts link to the editor; published articles link to the article page
  const href = isDraft ? `/post/${post.id}` : `/article/${post.id}`;

  return (
    <Link
      to={href}
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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileCard({ file }: { file: ApiFile }) {
  const url = fileToMediaUrl(file.name);
  const size = formatFileSize(file.size);
  const date = new Date(file.uploaded_at).toLocaleDateString();

  if (file.file_type === FileType.Photo) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="profile-file-photo">
        <img src={url} alt={file.name.split("/").pop() ?? "photo"} loading="lazy" />
        <div className="profile-file-photo__info">
          <span>{size}</span>
          <span>{date}</span>
        </div>
      </a>
    );
  }

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="profile-file-audio">
      <Music size={20} className="profile-file-audio__icon" />
      <div className="profile-file-audio__body">
        <span className="profile-file-audio__name">{file.meta?.mime_type || "audio"}</span>
        <span className="profile-file-audio__meta">
          {size}
          {file.meta?.duration_secs ? ` \u00b7 ${file.meta.duration_secs}s` : ""}
          {` \u00b7 ${date}`}
        </span>
      </div>
    </a>
  );
}

function NotificationIcon({ type }: { type: number }) {
  if (type === NotifType.Like) return <ThumbsUp size={14} />;
  if (type === NotifType.Dislike) return <ThumbsDown size={14} />;
  return <MessageSquare size={14} />;
}

function notifText(n: ApiNotification): string {
  const actor = n.actor_name || "Someone";
  if (n.type === NotifType.Like) {
    return n.target_type === NotifTargetType.Reply
      ? `${actor} liked your comment`
      : `${actor} liked your article`;
  }
  if (n.type === NotifType.Dislike) {
    return n.target_type === NotifTargetType.Reply
      ? `${actor} disliked your comment`
      : `${actor} disliked your article`;
  }
  return `${actor} replied to your comment`;
}

function FollowListModal({
  title,
  users,
  loading,
  onClose,
}: {
  title: string;
  users: FollowUser[];
  loading: boolean;
  onClose: () => void;
}) {
  return (
    <div className="follow-modal-overlay" onClick={onClose}>
      <div className="follow-modal" onClick={(e) => e.stopPropagation()}>
        <div className="follow-modal__header">
          <h2 className="follow-modal__title">{title}</h2>
          <button className="follow-modal__close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="follow-modal__body">
          {loading ? (
            <div style={{ textAlign: "center", padding: "var(--space-8)" }}>
              <Loader2 size={24} className="animate-spin" style={{ color: "var(--color-text-tertiary)" }} />
            </div>
          ) : users.length === 0 ? (
            <div style={{ textAlign: "center", padding: "var(--space-8)", color: "var(--color-text-tertiary)", fontSize: "var(--text-sm)" }}>
              No users yet
            </div>
          ) : (
            <ul className="follow-modal__list">
              {users.map((u) => (
                <li key={u.id}>
                  <Link to={`/profile/${u.profile_name}`} className="follow-modal__user" onClick={onClose}>
                    <div className="follow-modal__avatar">
                      <User size={16} />
                    </div>
                    <span className="follow-modal__name">{u.profile_name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const [tab, setTab] = useState<"posts" | "drafts" | "saved" | "files" | "notifications" | "settings">("posts");
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  useDocumentHead({ title: "Profile" });
  const isOwnProfile = !slug;

  // Fetch profile for other users
  const fetchProfile = useCallback(
    () => slug ? getProfileBySlug(slug) : Promise.resolve(null),
    [slug],
  );
  const { data: otherProfile, isLoading: profileLoading, error: profileError } = useApi<ApiProfile | null>(fetchProfile, [slug]);

  const profile: ApiProfile | null = isOwnProfile ? user : otherProfile;
  const profileId = profile?.id;

  // Follow state
  const [isFollowing, setIsFollowing] = useState(false);
  const [followId, setFollowId] = useState<string | null>(null);
  const [followBusy, setFollowBusy] = useState(false);
  const [followCnts, setFollowCnts] = useState<FollowCounts>({ followers: 0, following: 0 });

  // Follow list modal
  const [followModal, setFollowModal] = useState<"followers" | "following" | null>(null);
  const [followModalUsers, setFollowModalUsers] = useState<FollowUser[]>([]);
  const [followModalLoading, setFollowModalLoading] = useState(false);

  const openFollowModal = (type: "followers" | "following") => {
    if (!profileId) return;
    setFollowModal(type);
    setFollowModalUsers([]);
    setFollowModalLoading(true);
    const fetcher = type === "followers" ? getFollowers : getFollowing;
    fetcher(profileId)
      .then((res) => setFollowModalUsers(res.users))
      .catch(() => {})
      .finally(() => setFollowModalLoading(false));
  };

  useEffect(() => {
    if (!profileId) return;
    getFollowCounts(profileId).then(setFollowCnts).catch(() => {});
    if (!isOwnProfile && user) {
      getFollowStatus(profileId).then((data) => {
        setIsFollowing(data.following);
        setFollowId(data.follow_id ?? null);
      }).catch(() => {});
    }
  }, [profileId, isOwnProfile, user]);

  const handleFollow = async () => {
    if (!profileId || followBusy) return;
    setFollowBusy(true);
    try {
      if (isFollowing && followId) {
        await unfollowUser(followId);
        setIsFollowing(false);
        setFollowId(null);
        setFollowCnts((p) => ({ ...p, followers: Math.max(0, p.followers - 1) }));
      } else {
        const res = await followUser(profileId);
        setIsFollowing(true);
        setFollowId(res.id);
        setFollowCnts((p) => ({ ...p, followers: p.followers + 1 }));
      }
    } catch {
      // ignore
    } finally {
      setFollowBusy(false);
    }
  };

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

  // Fetch files for own profile only
  const fetchFiles = useCallback(
    () => isOwnProfile ? getMyFiles({ limit: 100 }) : Promise.resolve({ files: [], total: 0 }),
    [isOwnProfile],
  );
  const { data: filesData, isLoading: filesLoading } = useApi(fetchFiles, [isOwnProfile]);
  const allFiles = filesData?.files ?? [];
  const photoFiles = useMemo(() => allFiles.filter((f) => f.file_type === FileType.Photo), [allFiles]);
  const audioFiles = useMemo(() => allFiles.filter((f) => f.file_type === FileType.Audio), [allFiles]);

  // Fetch bookmarks for own profile
  const fetchBookmarks = useCallback(
    () => isOwnProfile ? getBookmarks({ limit: 100 }) : Promise.resolve({ articles: [], total: 0 }),
    [isOwnProfile],
  );
  const { data: bookmarksData, isLoading: bookmarksLoading } = useApi(fetchBookmarks, [isOwnProfile]);
  const savedArticles = useMemo(
    () => (bookmarksData?.articles ?? []).map((s) => apiToArticle(s, t)),
    [bookmarksData],
  );

  // Notifications for own profile
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [notifsLoading, setNotifsLoading] = useState(false);

  useEffect(() => {
    if (!isOwnProfile) return;
    setNotifsLoading(true);
    getNotifications({ limit: 50 })
      .then((res) => setNotifications(res.notifications))
      .catch(() => {})
      .finally(() => setNotifsLoading(false));
  }, [isOwnProfile]);

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead().catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleNotifClick = async (n: ApiNotification) => {
    if (!n.read) {
      markNotificationRead(n.id).catch(() => {});
      setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, read: true } : x));
    }
    navigate(`/article/${n.article_id}`);
  };

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

  const name = profile?.profile_name ?? t("profile.anonymous");
  const email = profile?.email ?? "";
  const joined = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString(language === "fi" ? "fi-FI" : "en-US", { month: "long", year: "numeric" })
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
          {isOwnProfile ? (
            <button className="profile-logout" onClick={handleLogout}>
              <LogOut size={16} />
              <span>{t("profile.logout")}</span>
            </button>
          ) : user && (
            <button
              className={`profile-follow-btn ${isFollowing ? "profile-follow-btn--following" : ""}`}
              onClick={handleFollow}
              disabled={followBusy}
            >
              {isFollowing ? <UserCheck size={16} /> : <UserPlus size={16} />}
              <span>{isFollowing ? t("profile.following") : t("profile.follow")}</span>
            </button>
          )}
        </div>

        <div className="profile-stats">
          <div className="profile-stat">
            <span className="profile-stat__value">{profile?.karma ?? 0}</span>
            <span className="profile-stat__label">{t("profile.karma")}</span>
          </div>
          <div className="profile-stat">
            <span className="profile-stat__value">{publishedPosts.length}</span>
            <span className="profile-stat__label">{t("profile.published")}</span>
          </div>
          <button className="profile-stat profile-stat--clickable" onClick={() => openFollowModal("followers")}>
            <span className="profile-stat__value">{followCnts.followers}</span>
            <span className="profile-stat__label">{t("profile.followers")}</span>
          </button>
          <button className="profile-stat profile-stat--clickable" onClick={() => openFollowModal("following")}>
            <span className="profile-stat__value">{followCnts.following}</span>
            <span className="profile-stat__label">{t("profile.following")}</span>
          </button>
          {isOwnProfile && (
            <div className="profile-stat">
              <span className="profile-stat__value">{drafts.length}</span>
              <span className="profile-stat__label">{t("profile.drafts")}</span>
            </div>
          )}
          {isOwnProfile && (
            <div className="profile-stat">
              <span className="profile-stat__value">{allFiles.length}</span>
              <span className="profile-stat__label">{t("profile.files")}</span>
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
              className={`profile-tab ${tab === "saved" ? "profile-tab--active" : ""}`}
              onClick={() => setTab("saved")}
            >
              Saved
            </button>
          )}
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
              className={`profile-tab ${tab === "files" ? "profile-tab--active" : ""}`}
              onClick={() => setTab("files")}
            >
              {t("profile.files")}
            </button>
          )}
          {isOwnProfile && (
            <button
              className={`profile-tab ${tab === "notifications" ? "profile-tab--active" : ""}`}
              onClick={() => setTab("notifications")}
            >
              <Bell size={14} />
              Notifications
              {notifications.filter((n) => !n.read).length > 0 && (
                <span className="profile-tab__badge">{notifications.filter((n) => !n.read).length}</span>
              )}
            </button>
          )}
          {isOwnProfile && (
            <button
              className={`profile-tab ${tab === "settings" ? "profile-tab--active" : ""}`}
              onClick={() => setTab("settings")}
            >
              {t("profile.settings")}
            </button>
          )}
        </div>

        {tab === "settings" ? (
          <AccountSettings />
        ) : tab === "notifications" ? (
          notifsLoading ? (
            <div style={{ textAlign: "center", padding: "var(--space-8)", color: "var(--color-text-tertiary)" }}>
              <Loader2 size={24} className="animate-spin" />
            </div>
          ) : notifications.length > 0 ? (
            <div className="profile-notifications">
              {notifications.some((n) => !n.read) && (
                <button className="profile-notifs__mark-all" onClick={handleMarkAllRead}>
                  Mark all as read
                </button>
              )}
              <ul className="profile-notifs__list">
                {notifications.map((n) => (
                  <li
                    key={n.id}
                    className={`profile-notif ${!n.read ? "profile-notif--unread" : ""}`}
                    onClick={() => handleNotifClick(n)}
                  >
                    <div className={`profile-notif__icon profile-notif__icon--${n.type === NotifType.Like ? "like" : n.type === NotifType.Dislike ? "dislike" : "reply"}`}>
                      <NotificationIcon type={n.type} />
                    </div>
                    <div className="profile-notif__body">
                      <span className="profile-notif__text">{notifText(n)}</span>
                      <span className="profile-notif__article">{n.article_title}</span>
                      <span className="profile-notif__time">{timeAgo(n.created_at)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="profile-empty">
              <div className="profile-empty__icon"><Bell size={32} /></div>
              <p className="profile-empty__text">No notifications yet</p>
            </div>
          )
        ) : tab === "saved" ? (
          bookmarksLoading ? (
            <div style={{ textAlign: "center", padding: "var(--space-8)", color: "var(--color-text-tertiary)" }}>
              <Loader2 size={24} className="animate-spin" />
            </div>
          ) : savedArticles.length > 0 ? (
            <div className="profile-saved-grid">
              {savedArticles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          ) : (
            <div className="profile-empty">
              <div className="profile-empty__icon"><Bookmark size={32} /></div>
              <p className="profile-empty__text">No saved articles yet</p>
            </div>
          )
        ) : tab === "files" ? (
          filesLoading ? (
            <div style={{ textAlign: "center", padding: "var(--space-8)", color: "var(--color-text-tertiary)" }}>
              <Loader2 size={24} className="animate-spin" />
            </div>
          ) : allFiles.length > 0 ? (
            <div className="profile-files">
              {photoFiles.length > 0 && (
                <div className="profile-files__section">
                  <h3 className="profile-files__heading">
                    <ImageIcon size={14} />
                    Photos ({photoFiles.length})
                  </h3>
                  <div className="profile-files__grid">
                    {photoFiles.map((f) => (
                      <FileCard key={f.id} file={f} />
                    ))}
                  </div>
                </div>
              )}
              {audioFiles.length > 0 && (
                <div className="profile-files__section">
                  <h3 className="profile-files__heading">
                    <Music size={14} />
                    Audio ({audioFiles.length})
                  </h3>
                  <div className="profile-files__list">
                    {audioFiles.map((f) => (
                      <FileCard key={f.id} file={f} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="profile-empty">
              <div className="profile-empty__icon">
                <FolderOpen size={32} />
              </div>
              <p className="profile-empty__text">{t("profile.noFiles")}</p>
              {isOwnProfile && (
                <Link to="/post" className="profile-empty__cta">
                  {t("profile.writeFirst")}
                </Link>
              )}
            </div>
          )
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
                {t("profile.writeFirst")}
              </Link>
            )}
          </div>
        )}
      </main>

      {followModal && (
        <FollowListModal
          title={followModal === "followers" ? t("profile.followers") : t("profile.following")}
          users={followModalUsers}
          loading={followModalLoading}
          onClose={() => setFollowModal(null)}
        />
      )}

      <BottomBar />
    </>
  );
}
