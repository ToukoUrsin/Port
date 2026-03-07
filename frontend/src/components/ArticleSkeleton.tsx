import "./ArticleSkeleton.css";

export function ArticleCardSkeleton() {
  return (
    <div className="card article-skeleton">
      <div className="skeleton skeleton-img" />
      <div className="article-skeleton__body">
        <div className="skeleton skeleton-badge" />
        <div className="skeleton skeleton-title" />
        <div className="skeleton skeleton-text" />
        <div className="skeleton skeleton-text skeleton-text--short" />
        <div className="skeleton skeleton-meta" />
      </div>
    </div>
  );
}

export function ArticleGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="article-grid">
      {Array.from({ length: count }, (_, i) => (
        <ArticleCardSkeleton key={i} />
      ))}
    </div>
  );
}
