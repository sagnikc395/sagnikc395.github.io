import { useEffect } from "react";
import type { FC } from "react";

interface SeoProps {
  title: string;
  ogTitle?: string | null;
  description: string;
}

function setMeta(attribute: "name" | "property", key: string, content: string) {
  let meta = document.head.querySelector<HTMLMetaElement>(
    `meta[${attribute}="${key}"]`,
  );

  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute(attribute, key);
    document.head.appendChild(meta);
  }

  meta.content = content;
}

const Seo: FC<SeoProps> = ({ title, ogTitle, description }) => {
  useEffect(() => {
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
  }, [description, ogTitle, title]);

  return null;
};

export default Seo;
