import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { MapPin, User, ImageIcon, FileText, ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar";
import BottomBar from "@/components/BottomBar";
import { getAuthorBySlug, getArticlesByAuthor, BADGE_CLASS, authorSlug, type Article } from "@/data/articles";
import "./ProfilePage.css";

const DRAFT_POSTS: Article[] = [
  {
    id: 10,
    title: "New Bike Lane Network Proposal for Riverside District",
    excerpt:
      "A draft proposal for connecting the east and west bike paths through downtown, with protected lanes on three major streets.",
    body: "",
    category: "council",
    author: "Maria Santos",
    timeAgo: "1 hour ago",
    image: "",
  },
  {
    id: 11,
    title: "Interview Notes: Fire Chief on Summer Preparedness",
    excerpt:
      "Key takeaways from a sit-down with Chief Rodriguez about wildfire prevention and new equipment acquisitions.",
    body: "",
    category: "community",
    author: "Maria Santos",
    timeAgo: "2 days ago",
    image: "",
  },
];

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

export default function ProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const [tab, setTab] = useState<"posts" | "drafts">("posts");

  const author = slug ? getAuthorBySlug(slug) : null;
  const isOwnProfile = !slug;

  const name = author?.name ?? "Maria Santos";
  const email = author?.email ?? "maria.santos@email.com";
  const joined = author?.joined ?? "March 2026";

  const publishedPosts = getArticlesByAuthor(name);
  const drafts = isOwnProfile ? DRAFT_POSTS : [];
  const items = tab === "posts" ? publishedPosts : drafts;

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
            <span className="profile-email">{email}</span>
            <span className="profile-joined">Joined {joined}</span>
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
        </div>

        {items.length > 0 ? (
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
