import { useState, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, ChevronDown, ImageIcon, Mic, MessageSquare, User, ThumbsUp, Send } from "lucide-react";
import { getArticleById, getRelatedArticles, BADGE_CLASS, authorSlug } from "@/data/articles";
import Navbar from "@/components/Navbar";
import "./ArticlePage.css";

function QualityScore({
  score,
  dimensions,
}: {
  score: number;
  dimensions: {
    factualAccuracy: number;
    quoteAttribution: number;
    perspectives: number;
    representation: number;
    ethicalFraming: number;
    completeness: number;
  };
}) {
  const [open, setOpen] = useState(false);

  const tier =
    score >= 80 ? "high" : score >= 60 ? "medium" : "low";

  const dimLabels: { key: keyof typeof dimensions; label: string }[] = [
    { key: "factualAccuracy", label: "Factual accuracy" },
    { key: "quoteAttribution", label: "Quote attribution" },
    { key: "perspectives", label: "Perspectives" },
    { key: "representation", label: "Representation" },
    { key: "ethicalFraming", label: "Ethical framing" },
    { key: "completeness", label: "Completeness" },
  ];

  return (
    <div className="quality-section">
      <button className="quality-header" onClick={() => setOpen(!open)}>
        <div className="quality-header__left">
          <span className="quality-header__label">Quality review</span>
          <span className={`quality-score-badge quality-score-badge--${tier}`}>
            {score}/100
          </span>
        </div>
        <ChevronDown
          size={16}
          className={`quality-toggle-icon ${open ? "quality-toggle-icon--open" : ""}`}
        />
      </button>

      {open && (
        <div className="quality-dimensions">
          {dimLabels.map(({ key, label }) => (
            <div key={key} className="quality-dim">
              <div className="quality-dim__label">
                {label}
                <span className="quality-dim__value"> {dimensions[key]}</span>
              </div>
              <div className="quality-dim__bar">
                <div
                  className="quality-dim__fill"
                  style={{ width: `${dimensions[key]}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface Comment {
  id: number;
  author: string;
  text: string;
  timeAgo: string;
  likes: number;
  liked: boolean;
}

const SEED_COMMENTS: Record<number, Comment[]> = {
  1: [
    { id: 1, author: "David Park", text: "Great to see the council moving forward on this. The 30% affordable housing amendment was crucial — without it this would just be another gentrification project.", timeAgo: "1 hour ago", likes: 12, liked: false },
    { id: 2, author: "Elena M.", text: "I was at the hearing. The energy in the room was incredible. People really care about downtown.", timeAgo: "45 min ago", likes: 8, liked: false },
    { id: 3, author: "Robert Chen", text: "Does anyone know which lots specifically? I heard the one on 2nd Ave might affect parking for nearby businesses.", timeAgo: "30 min ago", likes: 3, liked: false },
  ],
  2: [
    { id: 1, author: "Coach Chen", text: "So proud of these kids. They've been working after school every day since September.", timeAgo: "3 hours ago", likes: 15, liked: false },
    { id: 2, author: "Aisha T.", text: "Go Volt! State championship here we come!", timeAgo: "2 hours ago", likes: 7, liked: false },
  ],
  3: [
    { id: 1, author: "Lisa Huang", text: "Sweet Rise has the best sourdough in town. So happy they're expanding!", timeAgo: "4 hours ago", likes: 9, liked: false },
  ],
  5: [
    { id: 1, author: "Tom Nakamura", text: "Signed up for a plot! Can't wait to start growing tomatoes this spring.", timeAgo: "1 day ago", likes: 6, liked: false },
    { id: 2, author: "Carmen D.", text: "This is exactly what the East Side needed. Thank you to all the volunteers!", timeAgo: "1 day ago", likes: 11, liked: false },
  ],
};

function Comments({ articleId }: { articleId: number }) {
  const [comments, setComments] = useState<Comment[]>(SEED_COMMENTS[articleId] || []);
  const [newComment, setNewComment] = useState("");
  const [showAll, setShowAll] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    const text = newComment.trim();
    if (!text) return;
    setComments((prev) => [
      ...prev,
      {
        id: Date.now(),
        author: "You",
        text,
        timeAgo: "Just now",
        likes: 0,
        liked: false,
      },
    ]);
    setNewComment("");
    setShowAll(true);
  };

  const handleLike = (commentId: number) => {
    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? { ...c, liked: !c.liked, likes: c.liked ? c.likes - 1 : c.likes + 1 }
          : c
      )
    );
  };

  const visible = showAll ? comments : comments.slice(0, 3);
  const hasMore = comments.length > 3 && !showAll;

  return (
    <div className="comments-section">
      <h2 className="comments-section__title">
        <MessageSquare size={18} />
        Comments
        {comments.length > 0 && (
          <span className="comments-section__count">{comments.length}</span>
        )}
      </h2>

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
            <button className="comment-form__submit" onClick={handleSubmit}>
              <Send size={16} />
            </button>
          )}
        </div>
      </div>

      {visible.length > 0 && (
        <div className="comments-list">
          {visible.map((comment) => (
            <div key={comment.id} className="comment">
              <div className="comment__avatar">
                <User size={14} />
              </div>
              <div className="comment__body">
                <div className="comment__header">
                  <span className="comment__author">{comment.author}</span>
                  <span className="comment__time">{comment.timeAgo}</span>
                </div>
                <p className="comment__text">{comment.text}</p>
                <button
                  className={`comment__like ${comment.liked ? "comment__like--active" : ""}`}
                  onClick={() => handleLike(comment.id)}
                >
                  <ThumbsUp size={12} />
                  {comment.likes > 0 && <span>{comment.likes}</span>}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {hasMore && (
        <button className="comments-show-more" onClick={() => setShowAll(true)}>
          Show all {comments.length} comments
          <ChevronDown size={14} />
        </button>
      )}
    </div>
  );
}

export default function ArticlePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const article = getArticleById(Number(id));

  if (!article) {
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

  const related = getRelatedArticles(article, 3);

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
          <span className={`badge ${BADGE_CLASS[article.category]}`}>
            {article.category}
          </span>
          <span className="article-meta__time">
            <Clock size={12} />
            {article.timeAgo}
          </span>
        </div>

        <h1 className="article-title">{article.title}</h1>
        <p className="article-author">
          By <Link to={`/profile/${authorSlug(article.author)}`} className="article-author__link">{article.author}</Link>
        </p>

        {article.sourceType && (
          <div className="article-source">
            <Mic size={12} />
            Written from {article.sourceType.toLowerCase()} by <Link to={`/profile/${authorSlug(article.author)}`} className="article-author__link">{article.author}</Link>
          </div>
        )}

        <div className="article-body">
          {article.body.split("\n\n").map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>

        {article.qualityScore != null && article.qualityDimensions && (
          <QualityScore
            score={article.qualityScore}
            dimensions={article.qualityDimensions}
          />
        )}

        <Comments articleId={article.id} />

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
                    <span className={`badge ${BADGE_CLASS[r.category]}`}>
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
