import { useState, useRef, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, ImageIcon, MessageSquare, User, Send, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { BADGE_CLASS, authorSlug } from "@/data/articles";
import { useApi } from "@/hooks/useApi";
import { getArticle, getArticles, getReplies, createReply } from "@/lib/api";
import { apiToArticle, timeAgo } from "@/lib/types";
import type { ApiReply } from "@/lib/types";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import "./ArticlePage.css";

function Comments({ articleId }: { articleId: string }) {
  const { isAuthenticated } = useAuth();
  const fetchReplies = useCallback(() => getReplies(articleId), [articleId]);
  const { data: repliesData, isLoading } = useApi(fetchReplies, [articleId]);
  const [localReplies, setLocalReplies] = useState<ApiReply[]>([]);
  const [newComment, setNewComment] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const allReplies = [...(repliesData?.replies ?? []), ...localReplies];

  const handleSubmit = async () => {
    const text = newComment.trim();
    if (!text || submitting) return;
    setSubmitting(true);
    try {
      const reply = await createReply(articleId, text);
      setLocalReplies((prev) => [...prev, reply]);
      setNewComment("");
      setShowAll(true);
    } catch {
      // Could show error toast
    } finally {
      setSubmitting(false);
    }
  };

  const visible = showAll ? allReplies : allReplies.slice(0, 3);
  const hasMore = allReplies.length > 3 && !showAll;

  return (
    <div className="comments-section">
      <h2 className="comments-section__title">
        <MessageSquare size={18} />
        Comments
        {allReplies.length > 0 && (
          <span className="comments-section__count">{allReplies.length}</span>
        )}
      </h2>

      {isAuthenticated && (
        <div className="comment-form">
          <div className="comment-form__avatar">
            <User size={16} />
          </div>
          <div className="comment-form__input-wrapper">
            <textarea
              ref={inputRef}
              className="input comment-form__input"
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              rows={1}
            />
            {newComment.trim() && (
              <button className="comment-form__submit" onClick={handleSubmit} disabled={submitting}>
                <Send size={16} />
              </button>
            )}
          </div>
        </div>
      )}

      {isLoading && (
        <div style={{ textAlign: "center", padding: "var(--space-4)", color: "var(--color-text-tertiary)" }}>
          <Loader2 size={20} className="animate-spin" />
        </div>
      )}

      {visible.length > 0 && (
        <div className="comments-list">
          {visible.map((reply) => (
            <div key={reply.id} className="comment">
              <div className="comment__avatar">
                <User size={14} />
              </div>
              <div className="comment__body">
                <div className="comment__header">
                  <span className="comment__author">{reply.profile_id.slice(0, 8)}</span>
                  <span className="comment__time">{timeAgo(reply.created_at)}</span>
                </div>
                <p className="comment__text">{reply.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {hasMore && (
        <button className="comments-show-more" onClick={() => setShowAll(true)}>
          Show all {allReplies.length} comments
        </button>
      )}
    </div>
  );
}

export default function ArticlePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const fetchArticle = useCallback(() => getArticle(id!), [id]);
  const { data: apiData, isLoading, error } = useApi(fetchArticle, [id]);

  const fetchRelated = useCallback(() => getArticles({ limit: 4 }), []);
  const { data: relatedData } = useApi(fetchRelated, []);

  const article = apiData ? apiToArticle(apiData) : null;
  const related = (relatedData?.articles ?? [])
    .filter((a) => a.id !== id)
    .slice(0, 3)
    .map(apiToArticle);

  if (isLoading) {
    return (
      <>
        <Navbar
          left={
            <button className="home-nav__icon-btn" onClick={() => navigate(-1)} title="Back">
              <ArrowLeft size={18} />
            </button>
          }
        />
        <div className="article-content" style={{ textAlign: "center", paddingTop: "var(--space-16)" }}>
          <Loader2 size={32} className="animate-spin" style={{ color: "var(--color-text-tertiary)" }} />
        </div>
      </>
    );
  }

  if (error || !article) {
    return (
      <>
        <Navbar
          left={
            <Link to="/" className="home-nav__icon-btn" title="Back">
              <ArrowLeft size={18} />
            </Link>
          }
        />
        <div className="article-content" style={{ textAlign: "center", paddingTop: "var(--space-16)" }}>
          <h1 className="article-title">Article not found</h1>
          <p style={{ color: "var(--color-text-secondary)", marginTop: "var(--space-4)" }}>
            This article doesn't exist or has been removed.
          </p>
          <Link to="/" className="btn btn-primary" style={{ marginTop: "var(--space-6)", display: "inline-flex" }}>
            Back to home
          </Link>
        </div>
      </>
    );
  }

  // Determine gate badge if review data is available
  const gate = apiData?.meta?.review?.gate;

  return (
    <>
      <Navbar
        left={
          <button className="home-nav__icon-btn" onClick={() => navigate(-1)} title="Back">
            <ArrowLeft size={18} />
          </button>
        }
      />

      <div className="article-hero">
        {article.image ? (
          <img src={article.image} alt={article.title} />
        ) : (
          <div className="article-hero__placeholder">
            <ImageIcon size={48} />
          </div>
        )}
      </div>

      <div className="article-content">
        <div className="article-meta">
          <span className={`badge ${BADGE_CLASS[article.category] || "badge-community"}`}>
            {article.category}
          </span>
          <span className="article-meta__time">
            <Clock size={12} />
            {article.timeAgo}
          </span>
          {gate && (
            <span className={`gate-badge-inline gate-badge-inline--${gate.toLowerCase()}`}>
              {gate === "GREEN" ? "Verified" : gate === "YELLOW" ? "Review notes" : "Needs changes"}
            </span>
          )}
        </div>

        <h1 className="article-title">{article.title}</h1>
        <p className="article-author">
          By <Link to={`/profile/${authorSlug(article.author)}`} className="article-author__link">{article.author}</Link>
        </p>

        <div className="article-body">
          {apiData?.meta?.article_markdown ? (
            <ReactMarkdown>{apiData.meta.article_markdown}</ReactMarkdown>
          ) : (
            article.body.split("\n\n").map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))
          )}
        </div>

        {/* Contributor card */}
        <div className="contributor-card">
          <div className="contributor-info">
            <span className="contributor-name">By {article.author}</span>
            <span className="contributor-date">{article.timeAgo}</span>
          </div>
          {apiData?.meta?.article_metadata?.category && (
            <span className={`badge ${BADGE_CLASS[apiData.meta.article_metadata.category] || "badge-community"}`}>
              {apiData.meta.article_metadata.category}
            </span>
          )}
        </div>

        <Comments articleId={id!} />

        {related.length > 0 && (
          <div className="more-stories">
            <h2 className="more-stories__title">More stories</h2>
            <div className="more-stories__grid">
              {related.map((r) => (
                <Link
                  key={r.id}
                  to={`/article/${r.id}`}
                  className="card more-card"
                >
                  <div className="more-card__img">
                    {r.image ? (
                      <img src={r.image} alt={r.title} />
                    ) : (
                      <div className="more-card__img-placeholder">
                        <ImageIcon size={24} />
                      </div>
                    )}
                  </div>
                  <div className="more-card__body">
                    <span className={`badge ${BADGE_CLASS[r.category] || "badge-community"}`}>
                      {r.category}
                    </span>
                    <h3 className="more-card__title">{r.title}</h3>
                    <div className="more-card__meta">
                      <span>{r.author}</span>
                      <span>&middot;</span>
                      <Clock size={10} />
                      <span>{r.timeAgo}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
