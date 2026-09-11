import { useEffect, useState, type CSSProperties } from "react";
import { flattenedPageUrl } from "../../journal/flattenPage";

/**
 * An AI page image as the book shows it — trimmed of any photographic frame
 * and fitted to the page (see flattenPage.ts) — so previews and thumbnails
 * match the 3D page instead of showing the raw render.
 */
export function FlatPageImage({ src, className, style }: { src: string; className?: string; style?: CSSProperties }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setUrl(null);
    flattenedPageUrl(src).then((flat) => {
      if (live) setUrl(flat);
    });
    return () => {
      live = false;
    };
  }, [src]);

  if (!url) {
    return <div className={className} style={{ ...style, aspectRatio: "1.15 / 1.55" }} aria-hidden="true" />;
  }
  return <img className={className} src={url} style={style} alt="Scrapbook page" />;
}
