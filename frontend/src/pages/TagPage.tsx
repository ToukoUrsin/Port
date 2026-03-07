import { useState, useCallback, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { ChevronDown, Loader2, Tag } from "lucide-react";
import Navbar from "@/components/Navbar";
import BottomBar from "@/components/BottomBar";
import Footer from "@/components/Footer";
import ArticleCard from "@/components/ArticleCard";
import { useApi } from "@/hooks/useApi";
import { getArticles } from "@/lib/api";
import { apiToArticle } from "@/lib/types";
import type { ArticleListResponse } from "@/lib/types";
import { useLanguage } from "@/contexts/LanguageContext";
import { BADGE_CLASS } from "@/data/articles";
import { getSavedLocationIds } from "@/pages/ExplorePage";
import "./TagPage.css";

const INITIAL_COUNT = 6;

export default function TagPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useLanguage();
  const category = slug || "";
  const badgeClass = BADGE_CLASS[category] || "badge-community";

  const savedLocIds = useMemo(() => getSavedLocationIds(), []);

  const fetchArticles = useCallback(
    () => getArticles({ category, limit: 100 }),
    [category],
  );
  const { data, isLoading, error } = useApi<ArticleListResponse>(fetchArticles, [category]);

  const allArticles = useMemo(
    () => (data?.articles ?? []).map((a) => ({ ...apiToArticle(a, t), _locationId: a.location_id })),
    [data, t],
  );

  const localArticles = useMemo(
    () => savedLocIds.length > 0
      ? allArticles.filter((a) => savedLocIds.includes(a._locationId))
      : [],
    [allArticles, savedLocIds],
  );

  const otherArticles = useMemo(
    () => savedLocIds.length > 0
      ? allArticles.filter((a) => !savedLocIds.includes(a._locationId))
      : allArticles,
    [allArticles, savedLocIds],
  );

  const [localExpanded, setLocalExpanded] = useState(false);
  const [otherExpanded, setOtherExpanded] = useState(false);

  const visibleLocal = localExpanded ? localArticles : localArticles.slice(0, INITIAL_COUNT);
  const visibleOther = otherExpanded ? otherArticles : otherArticles.slice(0, INITIAL_COUNT);

  const categoryLabel = category.charAt(0).toUpperCase() + category.slice(1);

  return (
    <>
      <Navbar />
      <main className="tag-container">
        <div className="tag-header">
          <div className="tag-header__icon">
            <Tag size={20} />
          </div>
          <div>
            <h1 className="tag-header__title">
              <span className={`badge ${badgeClass}`}>{categoryLabel}</span>
            </h1>
            <p className="tag-header__count">
              {allArticles.length} {allArticles.length === 1 ? "article" : "articles"}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="tag-loading">
            <Loader2 size={32} className="animate-spin" />
          </div>
        ) : error ? (
          <div className="tag-empty">
            <p>{t("home.loadError")}</p>
          </div>
        ) : allArticles.length === 0 ? (
          <div className="tag-empty">
            <Tag size={32} />
            <p>No articles tagged <strong>{categoryLabel}</strong> yet.</p>
            <Link to="/" className="btn btn-secondary">
              Back to home
            </Link>
          </div>
        ) : (
          <>
            {localArticles.length > 0 && (
              <section className="tag-section">
                <h2 className="tag-section__title">From your places</h2>
                <div className="tag-grid">
                  {visibleLocal.map((article) => (
                    <ArticleCard key={article.id} article={article} />
                  ))}
                </div>
                {localArticles.length > INITIAL_COUNT && !localExpanded && (
                  <div className="tag-section__more">
                    <button className="home-show-more" onClick={() => setLocalExpanded(true)}>
                      Show all {localArticles.length} articles
                      <ChevronDown size={16} />
                    </button>
                  </div>
                )}
              </section>
            )}

            {otherArticles.length > 0 && (
              <section className="tag-section">
                <h2 className="tag-section__title">
                  {localArticles.length > 0 ? "From elsewhere" : "All articles"}
                </h2>
                <div className="tag-grid">
                  {visibleOther.map((article) => (
                    <ArticleCard key={article.id} article={article} />
                  ))}
                </div>
                {otherArticles.length > INITIAL_COUNT && !otherExpanded && (
                  <div className="tag-section__more">
                    <button className="home-show-more" onClick={() => setOtherExpanded(true)}>
                      Show all {otherArticles.length} articles
                      <ChevronDown size={16} />
                    </button>
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </main>
      <Footer />
      <div className="home-fade-bottom" />
      <BottomBar />
    </>
  );
}
