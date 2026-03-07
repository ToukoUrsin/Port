import { forwardRef } from "react";
import ReactMarkdown from "react-markdown";

type ArticleRendererProps = {
  markdown: string;
  userName: string;
  category?: string;
  highlightedParagraph?: number;
};

export const ArticleRenderer = forwardRef<HTMLElement, ArticleRendererProps>(
  function ArticleRenderer(
    { markdown, userName, category, highlightedParagraph },
    ref,
  ) {
    const headlineMatch = markdown.match(/^# (.+)$/m);
    const headline = headlineMatch ? headlineMatch[1] : "Untitled";

    return (
      <article className="editorial-article" ref={ref}>
        <h1 className="article-headline">{headline}</h1>
        <div className="article-byline">
          By {userName} &middot; {new Date().toLocaleDateString()}
          {category && (
            <span className={`badge badge-${category}`}>{category}</span>
          )}
        </div>
        <div
          className="article-prose"
          data-highlighted-paragraph={highlightedParagraph ?? undefined}
        >
          <ReactMarkdown
            components={{
              p: ({ children, ...props }) => {
                return <p {...props}>{children}</p>;
              },
            }}
          >
            {markdown}
          </ReactMarkdown>
        </div>
      </article>
    );
  },
);
