import { useState, useRef, useCallback, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Clock, ImageIcon, MessageSquare, User, Send, Loader2, Flag, ChevronDown, ThumbsUp, ThumbsDown, Reply as ReplyIcon, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { BADGE_CLASS } from "@/data/articles";
import type { Article } from "@/data/articles";
import { useApi } from "@/hooks/useApi";
import { getArticle, getSimilarArticles, getReplies, createReply, deleteReply, flagArticle, getArticleReactions, reactArticle, unreactArticle, getReplyReactions, reactReply, unreactReply } from "@/lib/api";
import { apiToArticle, timeAgo, computeOverallScore } from "@/lib/types";
import type { ApiSubmission, ApiReply, ReactionCounts, ReplyReactionMap } from "@/lib/types";
import { useAuth } from "@/contexts/AuthContext";
import { QualityPanel } from "@/components/QualityPanel";
import { useLanguage } from "@/contexts/LanguageContext";
import Navbar from "@/components/Navbar";
import Modal from "@/components/Modal";
import "./ArticlePage.css";

function ArticleReactions({ articleId }: { articleId: string }) {
  const { t } = useLanguage();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [counts, setCounts] = useState<ReactionCounts>({ likes: 0, dislikes: 0 });
  const [userReaction, setUserReaction] = useState<number>(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    getArticleReactions(articleId).then((data) => {
      setCounts({ likes: data.likes, dislikes: data.dislikes });
      if (data.user_reaction !== undefined) setUserReaction(data.user_reaction);
    }).catch(() => {});
  }, [articleId, authLoading]);

  const total = counts.likes + counts.dislikes;
  const likePercent = total > 0 ? Math.round((counts.likes / total) * 100) : 0;

  const handleReact = async (kind: 1 | -1) => {
    if (busy || !isAuthenticated) return;
    setBusy(true);
    try {
      if (userReaction === kind) {
        const data = await unreactArticle(articleId);
        setCounts({ likes: data.likes, dislikes: data.dislikes });
        setUserReaction(0);
      } else {
        const data = await reactArticle(articleId, kind);
        setCounts({ likes: data.likes, dislikes: data.dislikes });
        setUserReaction(kind);
      }
    } catch {
      // ignore
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="article-reactions">
      <div className="article-reactions__buttons">
        <button
          className={`article-reactions__btn ${userReaction === 1 ? "article-reactions__btn--active" : ""}`}
          onClick={() => handleReact(1)}
          disabled={!isAuthenticated || busy}
        >
          <ThumbsUp size={16} />
          <span>{counts.likes}</span>
        </button>
        <button
          className={`article-reactions__btn article-reactions__btn--dislike ${userReaction === -1 ? "article-reactions__btn--active" : ""}`}
          onClick={() => handleReact(-1)}
          disabled={!isAuthenticated || busy}
        >
          <ThumbsDown size={16} />
          <span>{counts.dislikes}</span>
        </button>
      </div>
      {total > 0 && (
        <div className="article-reactions__bar-wrapper">
          <div className="article-reactions__bar">
            <div className="article-reactions__bar-fill" style={{ width: `${likePercent}%` }} />
          </div>
          <span className="article-reactions__percent">{likePercent}% {t("article.liked")}</span>
        </div>
      )}
    </div>
  );
}

function CommentReactions({ replyId, initialLikes, initialDislikes, initialReaction }: {
  replyId: string;
  initialLikes: number;
  initialDislikes: number;
  initialReaction: number; // 1 = like, -1 = dislike, 0 = none
}) {
  const { isAuthenticated } = useAuth();
  const [likes, setLikes] = useState(initialLikes);
  const [dislikes, setDislikes] = useState(initialDislikes);
  const [userReaction, setUserReaction] = useState(initialReaction);
  const [busy, setBusy] = useState(false);

  const handleReact = async (kind: 1 | -1) => {
    if (busy || !isAuthenticated) return;
    setBusy(true);
    try {
      if (userReaction === kind) {
        const data = await unreactReply(replyId);
        setLikes(data.likes);
        setDislikes(data.dislikes);
        setUserReaction(0);
      } else {
        const data = await reactReply(replyId, kind);
        setLikes(data.likes);
        setDislikes(data.dislikes);
        setUserReaction(kind);
      }
    } catch {
      // ignore
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="comment__reactions">
      <button
        className={`comment__react-btn ${userReaction === 1 ? "comment__react-btn--active" : ""}`}
        onClick={() => handleReact(1)}
        disabled={!isAuthenticated || busy}
      >
        <ThumbsUp size={12} />
        {likes > 0 && <span>{likes}</span>}
      </button>
      <button
        className={`comment__react-btn comment__react-btn--dislike ${userReaction === -1 ? "comment__react-btn--active" : ""}`}
        onClick={() => handleReact(-1)}
        disabled={!isAuthenticated || busy}
      >
        <ThumbsDown size={12} />
        {dislikes > 0 && <span>{dislikes}</span>}
      </button>
    </div>
  );
}

function InlineReplyForm({ articleId, parentId, onSubmitted, onCancel }: {
  articleId: string;
  parentId: string;
  onSubmitted: (reply: ApiReply) => void;
  onCancel: () => void;
}) {
  const { t } = useLanguage();
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async () => {
    const body = text.trim();
    if (!body || submitting) return;
    setSubmitting(true);
    try {
      const reply = await createReply(articleId, body, parentId);
      onSubmitted(reply);
      setText("");
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="comment-reply-form">
      <div className="comment-reply-form__input-wrapper">
        <textarea
          ref={inputRef}
          className="input comment-form__input"
          placeholder={t("article.writeReply")}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
            if (e.key === "Escape") onCancel();
          }}
          rows={1}
        />
        <div className="comment-reply-form__actions">
          <button className="comment-reply-form__cancel" onClick={onCancel}>{t("article.cancel")}</button>
          <button
            className="comment-reply-form__submit"
            onClick={handleSubmit}
            disabled={!text.trim() || submitting}
          >
            {submitting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
          </button>
        </div>
      </div>
    </div>
  );
}

function CommentItem({ reply, depth, replyReactions, articleId, onNewReply, onDelete }: {
  reply: ApiReply;
  depth: number;
  replyReactions: ReplyReactionMap;
  articleId: string;
  onNewReply: (reply: ApiReply) => void;
  onDelete: (replyId: string) => void;
}) {
  const { isAuthenticated, user } = useAuth();
  const { t } = useLanguage();
  const [showReplyForm, setShowReplyForm] = useState(false);
  const rxn = replyReactions[reply.id];
  const isDeleted = reply.status === 2;
  const isOwner = user?.id === reply.profile_id;

  if (isDeleted) {
    return (
      <div className={`comment comment--deleted ${depth > 0 ? "comment--nested" : ""}`}>
        {depth > 0 && (
          <div className="comment__thread-line" />
        )}
        <div className="comment__avatar">
          <User size={depth > 0 ? 12 : 14} />
        </div>
        <div className="comment__body">
          <p className="comment__text comment__text--deleted">{t("article.commentRemoved")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`comment ${depth > 0 ? "comment--nested" : ""}`}>
      {depth > 0 && (
        <div className="comment__thread-line" />
      )}
      <div className="comment__avatar">
        <User size={depth > 0 ? 12 : 14} />
      </div>
      <div className="comment__body">
        <div className="comment__header">
          <Link to={`/profile/${reply.profile_id}`} className="comment__author">{reply.profile_name || reply.profile_id.slice(0, 8)}</Link>
          <span className="comment__time">{timeAgo(reply.created_at)}</span>
        </div>
        <p className="comment__text">{reply.body}</p>
        <div className="comment__actions">
          <CommentReactions
            replyId={reply.id}
            initialLikes={rxn?.likes ?? reply.meta?.reactions?.like ?? 0}
            initialDislikes={rxn?.dislikes ?? reply.meta?.reactions?.dislike ?? 0}
            initialReaction={rxn?.user_reaction ?? 0}
          />
          {isAuthenticated && depth < 3 && (
            <button
              className="comment__reply-btn"
              onClick={() => setShowReplyForm((v) => !v)}
            >
              <ReplyIcon size={12} />
              {t("article.reply")}
            </button>
          )}
          {isOwner && (
            <button
              className="comment__reply-btn comment__delete-btn"
              onClick={() => onDelete(reply.id)}
            >
              <Trash2 size={12} />
              {t("article.deleteComment")}
            </button>
          )}
        </div>
        {showReplyForm && (
          <InlineReplyForm
            articleId={articleId}
            parentId={reply.id}
            onSubmitted={(r) => {
              onNewReply(r);
              setShowReplyForm(false);
            }}
            onCancel={() => setShowReplyForm(false)}
          />
        )}
      </div>
    </div>
  );
}

function buildThread(replies: ApiReply[]): Map<string | null, ApiReply[]> {
  const map = new Map<string | null, ApiReply[]>();
  for (const r of replies) {
    const key = r.parent_id ?? null;
    const list = map.get(key) ?? [];
    list.push(r);
    map.set(key, list);
  }
  return map;
}

function ThreadedReplies({ parentId, tree, depth, replyReactions, articleId, onNewReply, onDelete }: {
  parentId: string | null;
  tree: Map<string | null, ApiReply[]>;
  depth: number;
  replyReactions: ReplyReactionMap;
  articleId: string;
  onNewReply: (reply: ApiReply) => void;
  onDelete: (replyId: string) => void;
}) {
  const children = tree.get(parentId);
  if (!children || children.length === 0) return null;

  return (
    <div className={depth > 0 ? "comment__children" : undefined}>
      {children.map((reply) => (
        <div key={reply.id}>
          <CommentItem
            reply={reply}
            depth={depth}
            replyReactions={replyReactions}
            articleId={articleId}
            onNewReply={onNewReply}
            onDelete={onDelete}
          />
          <ThreadedReplies
            parentId={reply.id}
            tree={tree}
            depth={depth + 1}
            replyReactions={replyReactions}
            articleId={articleId}
            onNewReply={onNewReply}
            onDelete={onDelete}
          />
        </div>
      ))}
    </div>
  );
}

function Comments({ articleId }: { articleId: string }) {
  const { t } = useLanguage();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const fetchReplies = useCallback(() => getReplies(articleId), [articleId]);
  const { data: repliesData, isLoading } = useApi(fetchReplies, [articleId]);
  const [localReplies, setLocalReplies] = useState<ApiReply[]>([]);
  const [newComment, setNewComment] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [replyReactions, setReplyReactions] = useState<ReplyReactionMap>({});
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (authLoading) return;
    getReplyReactions(articleId).then((data) => {
      setReplyReactions(data.reactions || {});
    }).catch(() => {});
  }, [articleId, authLoading]);

  const allReplies = [...(repliesData?.replies ?? []), ...localReplies].map((r) =>
    deletedIds.has(r.id) ? { ...r, status: 2, body: "" } : r
  );
  const tree = buildThread(allReplies);
  const topLevel = tree.get(null) ?? [];

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

  const handleNewReply = (reply: ApiReply) => {
    setLocalReplies((prev) => [...prev, reply]);
    setShowAll(true);
  };

  const handleDelete = async (replyId: string) => {
    try {
      await deleteReply(replyId);
      setDeletedIds((prev) => new Set(prev).add(replyId));
    } catch {
      // Could show error toast
    }
  };

  const visibleTop = showAll ? topLevel : topLevel.slice(0, 3);
  const hasMore = topLevel.length > 3 && !showAll;

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

      {visibleTop.length > 0 && (
        <div className="comments-list">
          {visibleTop.map((reply) => (
            <div key={reply.id}>
              <CommentItem
                reply={reply}
                depth={0}
                replyReactions={replyReactions}
                articleId={articleId}
                onNewReply={handleNewReply}
                onDelete={handleDelete}
              />
              <ThreadedReplies
                parentId={reply.id}
                tree={tree}
                depth={1}
                replyReactions={replyReactions}
                articleId={articleId}
                onNewReply={handleNewReply}
                onDelete={handleDelete}
              />
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
  const navigate = useNavigate();
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

      <div className="article-content">
        <div className="article-meta">
          <Link to={`/tag/${article.category}`} className={`badge badge--clickable ${BADGE_CLASS[article.category] || "badge-community"}`}>
            {t("tag." + article.category)}
          </Link>
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
          {t("article.by")} <Link to={`/profile/${article.authorId}`} className="article-author__link">{article.author}</Link>
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
            <Link to={`/tag/${apiData.meta.article_metadata.category}`} className={`badge badge--clickable ${BADGE_CLASS[apiData.meta.article_metadata.category] || "badge-community"}`}>
              {t("tag." + apiData.meta.article_metadata.category)}
            </Link>
          )}
        </div>

        <ArticleReactions articleId={id!} />

        {isAuthenticated && !reportDone && (
          <div className="report-section">
            {!showReport ? (
              <button className="report-trigger" onClick={() => setShowReport(true)}>
                <Flag size={14} /> {t("article.reportArticle")}
              </button>
            ) : (
              <div className="report-form">
                <textarea
                  className="input"
                  placeholder={t("article.reportPlaceholder")}
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
                    {reportSubmitting ? <Loader2 size={14} className="animate-spin" /> : t("article.submitReport")}
                  </button>
                  <button className="btn btn-secondary" onClick={() => setShowReport(false)}>
                    {t("article.cancel")}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        {reportDone && (
          <p style={{ color: "var(--color-text-tertiary)", fontSize: "var(--text-sm)", fontFamily: "var(--font-sans)", marginTop: "var(--space-4)" }}>
            {t("article.reportThanks")}
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
                      <span
                        className={`badge badge--clickable ${BADGE_CLASS[a.category] || "badge-community"}`}
                        role="link"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/tag/${a.category}`);
                        }}
                      >
                        {t("tag." + a.category)}
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
                <Link
                  to={`/tag/${a.category}`}
                  className={`badge badge--clickable ${BADGE_CLASS[a.category] || "badge-community"}`}
                  onClick={() => setModalArticle(null)}
                >
                  {t("tag." + a.category)}
                </Link>
                <h2 className="article-modal__title">{a.title}</h2>
                <p className="article-modal__author">
                  {t("article.by")}{" "}
                  <Link
                    to={`/profile/${a.authorId}`}
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
                  {t("article.readFull")}
                </Link>
              </div>
            </>
          );
        })()}
      </Modal>
    </>
  );
}
