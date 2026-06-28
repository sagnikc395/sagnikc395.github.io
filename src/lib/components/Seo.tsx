import { useEffect } from "react";
import type { FC } from "react";

interface SeoProps {
  title: string;
  ogTitle?: string | null;
  description: string;
  keywords?: string[];
  meta?: Record<string, string | string[] | null | undefined>;
  publishedTime?: string | null;
}

function setMeta(
  attribute: "name" | "property",
  key: string,
  content: string,
  managed = false,
) {
  let meta = document.head.querySelector<HTMLMetaElement>(
    `meta[${attribute}="${key}"]`,
  );

  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute(attribute, key);
    document.head.appendChild(meta);
  }

  if (managed) {
    meta.dataset.seoCustom = "true";
  }

  meta.content = content;
}

function serializeMetaContent(value: string | string[]): string {
  return Array.isArray(value) ? value.join(", ") : value;
}

function hasMetaContent(
  value: string | string[] | null | undefined,
): value is string | string[] {
  return Array.isArray(value) ? value.length > 0 : Boolean(value);
}

const Seo: FC<SeoProps> = ({
  title,
  ogTitle,
  description,
  keywords,
  meta,
  publishedTime,
}) => {
  useEffect(() => {
    document.head
      .querySelectorAll<HTMLMetaElement>('meta[data-seo-custom="true"]')
      .forEach((element) => element.remove());

    document.title = title;
    setMeta("name", "description", description);
    setMeta("property", "og:title", ogTitle ?? title);
    setMeta("property", "og:description", description);
    setMeta(
      "property",
      "og:image",
      "https://sagnikc395.github.io/assets/images/profile.jpeg",
    );
    setMeta("name", "twitter:card", "summary_large_image");

    if (keywords?.length) {
      setMeta("name", "keywords", keywords.join(", "), true);
    }

    if (publishedTime) {
      setMeta("property", "article:published_time", publishedTime, true);
    }

    if (meta) {
      Object.entries(meta).forEach(([key, value]) => {
        if (hasMetaContent(value)) {
          setMeta("name", key, serializeMetaContent(value), true);
        }
      });
    }
  }, [description, keywords, meta, ogTitle, publishedTime, title]);

  return null;
};

export default Seo;
