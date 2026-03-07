import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2, SearchX } from "lucide-react";
import Navbar from "@/components/Navbar";
import BottomBar from "@/components/BottomBar";
import Footer from "@/components/Footer";
import ArticleCard from "@/components/ArticleCard";
import { search, searchSessionChunk } from "@/lib/api";
import { apiToArticle } from "@/lib/types";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Article } from "@/data/articles";
import "./SearchPage.css";

export default function SearchPage() {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const q = searchParams.get("q") || "";

  const [articles, setArticles] = useState<Article[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const [totalResults, setTotalResults] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initial search when q changes
  useEffect(() => {
    if (!q.trim()) {
      setArticles([]);
      setSessionId(null);
      setTotalResults(0);
      setTotalChunks(0);
      setCurrentChunk(0);
      return;
    }

    setIsLoading(true);
    setError(null);
    setArticles([]);

    search({ q: q.trim() })
      .then((res) => {
        setArticles((res.submissions || []).map((s) => apiToArticle(s, t)));
        setSessionId(res.session_id);
        setCurrentChunk(res.chunk);
        setTotalChunks(res.total_chunks);
        setTotalResults(res.total_results);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Search failed");
        setIsLoading(false);
      });
  }, [q]);

  const loadMore = useCallback(() => {
    if (!sessionId || currentChunk >= totalChunks) return;
    setIsLoadingMore(true);

    searchSessionChunk(sessionId, currentChunk + 1)
      .then((res) => {
        const newArticles = (res.submissions || []).map((s) => apiToArticle(s, t));
        setArticles((prev) => [...prev, ...newArticles]);
        setCurrentChunk(res.chunk);
        setIsLoadingMore(false);
      })
      .catch(() => {
        setIsLoadingMore(false);
      });
  }, [sessionId, currentChunk, totalChunks]);

  const hasMore = currentChunk < totalChunks;

  return (
    <>
      <Navbar initialQuery={q} />

      <main className="search-container">
        {q.trim() && !isLoading && !error && (
          <div className="search-header">
            <h1 className="search-header__count">
              {totalResults} {totalResults !== 1 ? t("search.results") : t("search.result")} — &ldquo;{q}&rdquo;
            </h1>
          </div>
        )}

        {isLoading ? (
          <div className="search-loading">
            <Loader2 size={32} className="animate-spin" />
          </div>
        ) : error ? (
          <div className="search-empty">
            <p>{error}</p>
          </div>
        ) : !q.trim() ? (
          <div className="search-empty">
            <SearchX size={48} />
            <p>{t("search.enterTerm")}</p>
          </div>
        ) : articles.length === 0 ? (
          <div className="search-empty">
            <SearchX size={48} />
            <p>{t("search.noResults")} — &ldquo;{q}&rdquo;</p>
          </div>
        ) : (
          <>
            <div className="article-grid">
              {articles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>

            {hasMore && (
              <div className="search-load-more">
                <button
                  className="btn btn-secondary"
                  onClick={loadMore}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      {t("search.loading")}
                    </>
                  ) : (
                    t("search.loadMore")
                  )}
                </button>
              </div>
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
