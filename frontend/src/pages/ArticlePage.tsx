import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, ImageIcon, MessageSquare, User, Send, Loader2, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { BADGE_CLASS, authorSlug } from "@/data/articles";
import type { Article } from "@/data/articles";
import { useApi } from "@/hooks/useApi";
import { getArticle, getSimilarArticles, getReplies, createReply } from "@/lib/api";
import { apiToArticle, timeAgo } from "@/lib/types";
import type { ApiSubmission, ApiReply } from "@/lib/types";
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

function ArticleModal({
  article,
  apiSubmission,
  onClose,
}: {
  article: Article;
  apiSubmission: ApiSubmission;
  onClose: () => void;
}) {
  const [visible, setVisible] = useState(false);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 200);
  }, [onClose]);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleClose]);

  const markdown = apiSubmission.meta?.article_markdown || article.body || "";
  const previewParagraphs = markdown.split("\n\n").slice(0, 3).join("\n\n");

  return (
    <div className={`article-overlay ${visible ? "article-overlay--visible" : ""}`} onClick={handleClose}>
      <div className={`article-modal ${visible ? "article-modal--visible" : ""}`} onClick={(e) => e.stopPropagation()}>
        <button className="article-modal__close" onClick={handleClose}>
          <X size={18} />
        </button>

        {article.image && (
          <div className="article-modal__image">
            <img src={article.image} alt={article.title} />
          </div>
        )}

        <div className="article-modal__content">
          <span className={`badge ${BADGE_CLASS[article.category] || "badge-community"}`}>
            {article.category}
          </span>

          <h2 className="article-modal__title">{article.title}</h2>

          <p className="article-modal__author">
            By{" "}
            <Link to={`/profile/${authorSlug(article.author)}`} className="article-author__link" onClick={handleClose}>
              {article.author}
            </Link>
            <span className="article-modal__time">{article.timeAgo}</span>
          </p>

          <div className="article-modal__body">
            <ReactMarkdown>{previewParagraphs}</ReactMarkdown>
          </div>

          <Link to={`/article/${article.id}`} className="btn btn-secondary article-modal__cta" onClick={handleClose}>
            Read full article
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ArticlePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const fetchArticle = useCallback(() => getArticle(id!), [id]);
  const { data: apiData, isLoading, error } = useApi(fetchArticle, [id]);

  const fetchSimilar = useCallback(() => getSimilarArticles(id!), [id]);
  const { data: similarData } = useApi(fetchSimilar, [id]);

  const [modalArticle, setModalArticle] = useState<{ article: Article; submission: ApiSubmission } | null>(null);

  const article = apiData ? apiToArticle(apiData) : null;
  const similarSubmissions = similarData?.articles ?? [];
  const similar = similarSubmissions.slice(0, 5);

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

        {similar.length > 0 && (
          <div className="similar-stories">
            <h2 className="similar-stories__title">Similar stories</h2>
            <div className="similar-stories__grid">
              {similar.map((s) => {
                const a = apiToArticle(s);
                return (
                  <button
                    key={a.id}
                    className="card similar-card"
                    onClick={() => setModalArticle({ article: a, submission: s })}
                  >
                    <div className="similar-card__img">
                      {a.image ? (
                        <img src={a.image} alt={a.title} />
                      ) : (
                        <div className="similar-card__img-placeholder">
                          <ImageIcon size={20} />
                        </div>
                      )}
                    </div>
                    <div className="similar-card__body">
                      <span className={`badge ${BADGE_CLASS[a.category] || "badge-community"}`}>
                        {a.category}
                      </span>
                      <h3 className="similar-card__title">{a.title}</h3>
                      <div className="similar-card__meta">
                        <span>{a.author}</span>
                        <span>&middot;</span>
                        <Clock size={10} />
                        <span>{a.timeAgo}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {modalArticle && (
        <ArticleModal
          article={modalArticle.article}
          apiSubmission={modalArticle.submission}
          onClose={() => setModalArticle(null)}
        />
      )}
    </>
  );
}
