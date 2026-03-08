import { useEffect } from "react";

const SITE_NAME = "PORT Local News";
const DEFAULT_DESCRIPTION = "AI-powered local news from your community";

function setMeta(property: string, content: string) {
  const attr = property.startsWith("og:") ? "property" : "name";
  let el = document.querySelector(`meta[${attr}="${property}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, property);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

export function useDocumentHead(opts: {
  title?: string;
  description?: string;
  image?: string;
}) {
  useEffect(() => {
    const prevTitle = document.title;

    document.title = opts.title ? `${opts.title} | PORT` : SITE_NAME;

    const desc = opts.description || DEFAULT_DESCRIPTION;
    const title = opts.title || SITE_NAME;

    setMeta("description", desc);
    setMeta("og:title", title);
    setMeta("og:description", desc);
    setMeta("twitter:title", title);
    setMeta("twitter:description", desc);

    if (opts.image) {
      setMeta("og:image", opts.image);
      setMeta("twitter:image", opts.image);
      setMeta("twitter:card", "summary_large_image");
    }

    return () => {
      document.title = prevTitle;
      setMeta("description", DEFAULT_DESCRIPTION);
      setMeta("og:title", SITE_NAME);
      setMeta("og:description", DEFAULT_DESCRIPTION);
      setMeta("twitter:title", SITE_NAME);
      setMeta("twitter:description", DEFAULT_DESCRIPTION);
      setMeta("twitter:card", "summary");
      // Remove article-specific image tags on unmount
      document.querySelector('meta[property="og:image"]')?.remove();
      document.querySelector('meta[name="twitter:image"]')?.remove();
    };
  }, [opts.title, opts.description, opts.image]);
}
