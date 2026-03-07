import { Link, useNavigate } from "react-router-dom";
import { Clock, ImageIcon } from "lucide-react";
import { BADGE_CLASS, authorSlug, type Article } from "@/data/articles";
import "./ArticleCard.css";

export default function ArticleCard({ article, featured }: { article: Article; featured?: boolean }) {
  const navigate = useNavigate();
  return (
    <Link
      to={`/article/${article.id}`}
      className={`card article-card ${article.isLead ? "article-card--lead" : ""} ${featured ? "article-card--featured" : ""}`}
      style={{ textDecoration: "none", color: "inherit" }}
    >
      <div className="article-card__img">
        {article.image ? (
          <img src={article.image} alt={article.title} />
        ) : (
          <div className="article-card__img-placeholder">
            <ImageIcon size={32} />
          </div>
        )}
      </div>
      <div className="article-card__body">
        <div className="article-card__meta">
          <span
            className={`badge badge--clickable ${BADGE_CLASS[article.category] || ""}`}
            role="link"
            tabIndex={0}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              navigate(`/tag/${article.category}`);
            }}
          >
            {article.category}
          </span>
        </div>
        <h2 className="article-card__title">
          <span className="title-prefix">{article.category}</span>
          <span className="title-sep"> | </span>
          {article.title}
        </h2>
        <p className="article-card__excerpt">{article.excerpt}</p>
        <div className="article-card__footer">
          <span
            className="article-card__author-link"
            role="link"
            tabIndex={0}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              navigate(`/profile/${authorSlug(article.author)}`);
            }}
          >
            {article.author}
          </span>
          <span>&middot;</span>
          <Clock size={12} />
          <span>{article.timeAgo}</span>
        </div>
      </div>
    </Link>
  );
}
