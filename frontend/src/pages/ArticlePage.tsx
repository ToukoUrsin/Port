import { useState, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { Clock, ImageIcon, MessageSquare, User, Send, Loader2, Flag, ChevronDown } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { BADGE_CLASS, authorSlug } from "@/data/articles";
import type { Article } from "@/data/articles";
import { useApi } from "@/hooks/useApi";
import { getArticle, getSimilarArticles, getReplies, createReply, flagArticle } from "@/lib/api";
import { apiToArticle, timeAgo, computeOverallScore } from "@/lib/types";
import type { ApiSubmission, ApiReply } from "@/lib/types";
import { useAuth } from "@/contexts/AuthContext";
import { QualityPanel } from "@/components/QualityPanel";
import { useLanguage } from "@/contexts/LanguageContext";
import Navbar from "@/components/Navbar";
import Modal from "@/components/Modal";
import "./ArticlePage.css";

function Comments({ articleId }: { articleId: string }) {
  const { t } = useLanguage();
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
        {t("article.comments")}
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
              placeholder={t("article.addComment")}
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
          {t("article.showAllComments").replace("{count}", String(allReplies.length))}
        </button>
      )}
    </div>
  );
}

export default function ArticlePage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useLanguage();

  const fetchArticle = useCallback(() => getArticle(id!), [id]);
  const { data: apiData, isLoading, error } = useApi(fetchArticle, [id]);

  const fetchSimilar = useCallback(() => getSimilarArticles(id!), [id]);
  const { data: similarData } = useApi(fetchSimilar, [id]);

  const [modalArticle, setModalArticle] = useState<{ article: Article; submission: ApiSubmission } | null>(null);
  const [showQuality, setShowQuality] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportDone, setReportDone] = useState(false);
  const { isAuthenticated } = useAuth();

  const article = apiData ? apiToArticle(apiData, t) : null;
  const similarSubmissions = similarData?.articles ?? [];
  const similar = similarSubmissions.slice(0, 5);

  if (isLoading) {
    return (
      <>
        <Navbar />
        <div className="article-content" style={{ textAlign: "center", paddingTop: "var(--space-16)" }}>
          <Loader2 size={32} className="animate-spin" style={{ color: "var(--color-text-tertiary)" }} />
        </div>
      </>
    );
  }

  if (error || !article) {
    return (
      <>
        <Navbar />
        <div className="article-content" style={{ textAlign: "center", paddingTop: "var(--space-16)" }}>
          <h1 className="article-title">{t("article.notFound")}</h1>
          <p style={{ color: "var(--color-text-secondary)", marginTop: "var(--space-4)" }}>
            {t("article.notFoundDesc")}
          </p>
          <Link to="/" className="btn btn-primary" style={{ marginTop: "var(--space-6)", display: "inline-flex" }}>
            {t("article.backHome")}
          </Link>
        </div>
      </>
    );
  }

  // Determine gate badge if review data is available
  const gate = apiData?.meta?.review?.gate;

  return (
    <>
      <Navbar />

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
          {gate && apiData?.meta?.review && (
            <button className="gate-badge-btn" onClick={() => setShowQuality((v) => !v)}>
              <span className={`gate-badge-inline gate-badge-inline--${gate.toLowerCase()}`}>
                {gate === "GREEN" ? t("article.gateGreen") : gate === "YELLOW" ? t("article.gateYellow") : t("article.gateRed")}
              </span>
              <span className="gate-badge-btn__score">
                {computeOverallScore(apiData.meta.review.scores)}
              </span>
              <ChevronDown size={12} style={{ transform: showQuality ? "rotate(180deg)" : undefined, transition: "transform 0.2s" }} />
            </button>
          )}
        </div>

        {showQuality && apiData?.meta?.review && (
          <QualityPanel review={apiData.meta.review} />
        )}

        <h1 className="article-title">{article.title}</h1>
        <p className="article-author">
          {t("article.by")} <Link to={`/profile/${authorSlug(article.author)}`} className="article-author__link">{article.author}</Link>
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
            <span className="contributor-name">{t("article.by")} {article.author}</span>
            <span className="contributor-date">{article.timeAgo}</span>
          </div>
          {apiData?.meta?.article_metadata?.category && (
            <span className={`badge ${BADGE_CLASS[apiData.meta.article_metadata.category] || "badge-community"}`}>
              {apiData.meta.article_metadata.category}
            </span>
          )}
        </div>

        {isAuthenticated && !reportDone && (
          <div className="report-section">
            {!showReport ? (
              <button className="report-trigger" onClick={() => setShowReport(true)}>
                <Flag size={14} /> Report this article
              </button>
            ) : (
              <div className="report-form">
                <textarea
                  className="input"
                  placeholder="Why are you reporting this article?"
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  rows={3}
                />
                <div className="report-form__actions">
                  <button
                    className="btn btn-primary"
                    disabled={!reportReason.trim() || reportSubmitting}
                    onClick={async () => {
                      setReportSubmitting(true);
                      try {
                        await flagArticle(id!, reportReason.trim());
                        setReportDone(true);
                        setShowReport(false);
                      } catch {
                        // Could show error toast
                      } finally {
                        setReportSubmitting(false);
                      }
                    }}
                  >
                    {reportSubmitting ? <Loader2 size={14} className="animate-spin" /> : "Submit report"}
                  </button>
                  <button className="btn btn-secondary" onClick={() => setShowReport(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        {reportDone && (
          <p style={{ color: "var(--color-text-tertiary)", fontSize: "var(--text-sm)", fontFamily: "var(--font-sans)", marginTop: "var(--space-4)" }}>
            Thank you for your report. Our team will review it.
          </p>
        )}

        <Comments articleId={id!} />

        {similar.length > 0 && (
          <div className="similar-stories">
            <h2 className="similar-stories__title">{t("article.similarStories")}</h2>
            <div className="similar-stories__grid">
              {similar.map((s) => {
                const a = apiToArticle(s, t);
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

      <Modal open={!!modalArticle} onClose={() => setModalArticle(null)} size="md">
        {modalArticle && (() => {
          const a = modalArticle.article;
          const markdown = modalArticle.submission.meta?.article_markdown || a.body || "";
          const previewParagraphs = markdown.split("\n\n").slice(0, 3).join("\n\n");
          return (
            <>
              {a.image && (
                <div className="article-modal__image">
                  <img src={a.image} alt={a.title} />
                </div>
              )}
              <div className="article-modal__content">
                <span className={`badge ${BADGE_CLASS[a.category] || "badge-community"}`}>
                  {a.category}
                </span>
                <h2 className="article-modal__title">{a.title}</h2>
                <p className="article-modal__author">
                  By{" "}
                  <Link
                    to={`/profile/${authorSlug(a.author)}`}
                    className="article-author__link"
                    onClick={() => setModalArticle(null)}
                  >
                    {a.author}
                  </Link>
                  <span className="article-modal__time">{a.timeAgo}</span>
                </p>
                <div className="article-modal__body">
                  <ReactMarkdown>{previewParagraphs}</ReactMarkdown>
                </div>
                <Link
                  to={`/article/${a.id}`}
                  className="btn btn-secondary article-modal__cta"
                  onClick={() => setModalArticle(null)}
                >
                  Read full article
                </Link>
              </div>
            </>
          );
        })()}
      </Modal>
    </>
  );
}
