import { Link, useNavigate } from "react-router-dom";
import { Clock, ImageIcon, MapPin } from "lucide-react";
import { BADGE_CLASS, type Article } from "@/data/articles";
import { useLanguage } from "@/contexts/LanguageContext";
import { BookmarkButton } from "@/components/BookmarkButton";
import "./ArticleCard.css";

export default function ArticleCard({ article, featured }: { article: Article; featured?: boolean }) {
  const { t } = useLanguage();
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
            {t("tag." + article.category)}
          </span>
        </div>
        <h2 className="article-card__title">
          {article.title}
        </h2>
        <p className="article-card__excerpt">{article.excerpt}</p>
        <div className="article-card__footer">
          <div className="article-card__footer-left">
            {article.area && (
              <>
                <MapPin size={12} />
                <span>{article.area}</span>
                <span>&middot;</span>
              </>
            )}
            <Clock size={12} />
            <span>{article.timeAgo}</span>
          </div>
          <BookmarkButton articleId={article.id} size={14} />
        </div>
      </div>
    </Link>
  );
}
