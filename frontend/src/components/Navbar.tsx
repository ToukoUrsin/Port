import { type ReactNode, useState, useEffect, useRef, useCallback } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { User, LogIn, Search, X, Clock, Loader2, PenSquare } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { search } from "@/lib/api";
import { apiToArticle } from "@/lib/types";
import type { SearchResponse } from "@/lib/types";
import { BADGE_CLASS } from "@/data/articles";
import type { Article } from "@/data/articles";

interface NavbarProps {
  left?: ReactNode;
  initialQuery?: string;
}

export default function Navbar({ left, initialQuery = "" }: NavbarProps) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<Article[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const clearSearch = useCallback(() => {
    setQuery("");
    setResults([]);
    setTotalResults(0);
    setIsLoading(false);
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      setResults([]);
      setTotalResults(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    debounceRef.current = setTimeout(() => {
      search({ q: query.trim() })
        .then((res: SearchResponse) => {
          const articles = (res.submissions || []).map(apiToArticle).slice(0, 10);
          setResults(articles);
          setTotalResults(res.total_results);
          setIsLoading(false);
        })
        .catch(() => {
          setResults([]);
          setTotalResults(0);
          setIsLoading(false);
        });
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Escape key clears search
  useEffect(() => {
    if (!query.trim()) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") clearSearch();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [query, clearSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      const q = query.trim();
      clearSearch();
      navigate(`/search?q=${encodeURIComponent(q)}`);
    }
  };

  const showDropdown = query.trim().length > 0;

  return (
    <>
      <nav className="home-nav">
        <div className="home-nav__left">
          {left}
        </div>

        <Link to="/" className="home-nav__brand">Local News</Link>

        <form className="home-nav__search" onSubmit={handleSubmit}>
          <Search size={16} className="home-nav__search-icon" />
          <input
            ref={inputRef}
            className="home-nav__search-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search articles..."
          />
          {query && (
            <button type="button" className="home-nav__search-clear" onClick={clearSearch}>
              <X size={14} />
            </button>
          )}

          {showDropdown && (
            <div className="search-dropdown">
              {isLoading ? (
                <div className="search-dropdown__loading">
                  <Loader2 size={20} className="animate-spin" />
                </div>
              ) : results.length === 0 ? (
                <div className="search-dropdown__empty">
                  No results for &ldquo;{query.trim()}&rdquo;
                </div>
              ) : (
                <>
                  <ul className="search-dropdown__list">
                    {results.map((article) => (
                      <li key={article.id}>
                        <Link
                          to={`/article/${article.id}`}
                          className="search-dropdown__item"
                          onClick={clearSearch}
                        >
                          <div className="search-dropdown__item-body">
                            <div className="search-dropdown__item-title">{article.title}</div>
                            <div className="search-dropdown__item-meta">
                              <span className={`badge ${BADGE_CLASS[article.category] || ""}`}>
                                {article.category}
                              </span>
                              <span>{article.author}</span>
                              <span>&middot;</span>
                              <Clock size={11} />
                              <span>{article.timeAgo}</span>
                            </div>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  {totalResults > results.length && (
                    <div className="search-dropdown__footer">
                      <Link
                        to={`/search?q=${encodeURIComponent(query.trim())}`}
                        onClick={clearSearch}
                      >
                        View all {totalResults} results
                      </Link>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </form>

        <div className="home-nav__right">
          <NavLink to="/post" className="home-nav__post-btn" title="Post a story">
            <PenSquare size={16} />
            <span>Post</span>
          </NavLink>
          {isAuthenticated ? (
            <NavLink to="/profile" className="home-nav__icon-btn" title="Profile">
              <User size={18} />
            </NavLink>
          ) : (
            <NavLink to="/login" className="home-nav__login-btn" title="Log in">
              <LogIn size={16} />
              <span>Log in</span>
            </NavLink>
          )}
        </div>
      </nav>

      {showDropdown && (
        <div className="search-dropdown__overlay" onClick={clearSearch} />
      )}
    </>
  );
}
