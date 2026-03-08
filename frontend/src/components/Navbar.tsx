import { useState, useEffect, useRef, useCallback } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { User, LogIn, Search, X, Clock, Loader2, PenSquare, MapPin, Bell } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { search, getToken } from "@/lib/api";
import { apiToArticle } from "@/lib/types";
import type { SearchResponse } from "@/lib/types";
import { useLanguage } from "@/contexts/LanguageContext";
import { BADGE_CLASS } from "@/data/articles";
import type { Article } from "@/data/articles";
import { connectNotificationStream } from "@/lib/notificationStream";
import NotificationDropdown from "@/components/NotificationDropdown";

interface NavbarProps {
  initialQuery?: string;
}

export default function Navbar({ initialQuery = "" }: NavbarProps) {
  const { isAuthenticated } = useAuth();
  const { t, language, setLanguage } = useLanguage();
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
      search({ q: query.trim(), mode: "hybrid" })
        .then((res: SearchResponse) => {
          const articles = (res.submissions || []).map((s) => apiToArticle(s, t)).slice(0, 10);
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

  // Notification state with SSE stream
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }

    const token = getToken();
    if (!token) return;

    const controller = connectNotificationStream(token, {
      onNotification: () => {
        setUnreadCount((prev) => prev + 1);
      },
      onCount: (count) => {
        setUnreadCount(count);
      },
    });

    return () => controller.abort();
  }, [isAuthenticated]);

  const handleNotifCountChange = useCallback((delta: number) => {
    if (delta === 0) {
      setUnreadCount(0);
    } else {
      setUnreadCount((prev) => Math.max(0, prev + delta));
    }
  }, []);

  const showDropdown = query.trim().length > 0;

  return (
    <>
      <nav className="home-nav">
        <div className="home-nav__left">
          <div className="lang-toggle">
            <button
              className={`lang-toggle__btn ${language === "fi" ? "lang-toggle__btn--active" : ""}`}
              onClick={() => setLanguage("fi")}
            >
              FI
            </button>
            <button
              className={`lang-toggle__btn ${language === "en" ? "lang-toggle__btn--active" : ""}`}
              onClick={() => setLanguage("en")}
            >
              EN
            </button>
          </div>
          <Link to="/explore" className="home-nav__icon-btn" title={t("navbar.selectCities")}>
            <MapPin size={18} />
          </Link>
        </div>

        <Link to="/" className="home-nav__brand">{t("navbar.brandName")}</Link>

        <form className="home-nav__search" onSubmit={handleSubmit}>
          <Search size={16} className="home-nav__search-icon" />
          <input
            ref={inputRef}
            className="home-nav__search-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("navbar.searchPlaceholder")}
          />
          {query && (
            <button type="button" className="home-nav__search-clear" onClick={clearSearch}>
              <X size={14} />
            </button>
          )}

          {showDropdown && (
            <div className="search-dropdown__overlay" onClick={clearSearch} />
          )}
          {showDropdown && (
            <div className="search-dropdown">
              {isLoading ? (
                <div className="search-dropdown__loading">
                  <Loader2 size={20} className="animate-spin" />
                </div>
              ) : results.length === 0 ? (
                <div className="search-dropdown__empty">
                  {t("navbar.noResults")} &ldquo;{query.trim()}&rdquo;
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
                                {t("tag." + article.category)}
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
                        {t("navbar.viewAllResults").replace("{count}", String(totalResults))}
                      </Link>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </form>

        <div className="home-nav__right">
          {isAuthenticated ? (
            <>
              <NavLink to="/post" className="home-nav__post-btn" title={t("navbar.post")}>
                <PenSquare size={16} />
                <span>{t("navbar.post")}</span>
              </NavLink>
              <div className="notif-bell-wrapper">
                <button
                  className="notif-bell"
                  onClick={() => setShowNotifDropdown((v) => !v)}
                  title={t("notifications.title")}
                >
                  <Bell size={20} />
                  {unreadCount > 0 && (
                    <span className="notif-bell__badge">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </button>
                {showNotifDropdown && (
                  <NotificationDropdown
                    onClose={() => setShowNotifDropdown(false)}
                    onCountChange={handleNotifCountChange}
                  />
                )}
              </div>
              <NavLink to="/profile" className="home-nav__icon-btn" title={t("navbar.profile")}>
                <User size={18} />
              </NavLink>
            </>
          ) : (
            <NavLink to="/login" className="home-nav__login-btn" title={t("navbar.login")}>
              <LogIn size={16} />
              <span>{t("navbar.login")}</span>
            </NavLink>
          )}
        </div>
      </nav>

      {/* Mobile-only second row: location + logo + profile/login */}
      <div className="home-nav-topbar">
        <Link to="/explore" className="home-nav-topbar__icon" title={t("navbar.selectCities")}>
          <MapPin size={18} />
        </Link>
        <Link to="/" className="home-nav-topbar__brand">{t("navbar.brandName")}</Link>
        {isAuthenticated ? (
          <div className="notif-bell-wrapper" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <button
              className="notif-bell"
              onClick={() => setShowNotifDropdown((v) => !v)}
              title={t("notifications.title")}
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="notif-bell__badge">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
            {showNotifDropdown && (
              <NotificationDropdown
                onClose={() => setShowNotifDropdown(false)}
                onCountChange={handleNotifCountChange}
              />
            )}
            <NavLink to="/profile" className="home-nav-topbar__icon" title={t("navbar.profile")}>
              <User size={18} />
            </NavLink>
          </div>
        ) : (
          <NavLink to="/login" className="home-nav-topbar__icon" title={t("navbar.login")}>
            <LogIn size={18} />
          </NavLink>
        )}
      </div>

    </>
  );
}
