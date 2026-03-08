import { useState, useEffect } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { bookmarkArticle, unbookmarkArticle, getBookmarkStatus } from "@/lib/api";

export function BookmarkButton({ articleId, size = 16 }: { articleId: string; size?: number }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [bookmarked, setBookmarked] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    getBookmarkStatus(articleId)
      .then((data) => setBookmarked(data.bookmarked))
      .catch(() => {});
  }, [articleId, isAuthenticated, isLoading]);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy || !isAuthenticated) return;
    setBusy(true);
    try {
      if (bookmarked) {
        await unbookmarkArticle(articleId);
        setBookmarked(false);
      } else {
        await bookmarkArticle(articleId);
        setBookmarked(true);
      }
    } catch {
      // ignore
    } finally {
      setBusy(false);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <button
      className={`bookmark-btn ${bookmarked ? "bookmark-btn--active" : ""}`}
      onClick={handleToggle}
      disabled={busy}
      title={bookmarked ? "Remove bookmark" : "Save for later"}
    >
      {bookmarked ? <BookmarkCheck size={size} /> : <Bookmark size={size} />}
    </button>
  );
}
