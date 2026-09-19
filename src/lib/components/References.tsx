import React from "react";
import type { Reference } from "../types";

interface ReferencesProps {
  references?: Reference[];
}

function normalize(ref: Reference): { label: string; href?: string } {
  if (typeof ref === "string") {
    // Bare URLs render as links, anything else as plain text.
    return /^https?:\/\//.test(ref)
      ? { label: ref, href: ref }
      : { label: ref };
  }
  return { label: ref.title ?? ref.url ?? "", href: ref.url };
}

const References: React.FC<ReferencesProps> = ({ references }) => {
  if (!references || references.length === 0) return null;

  return (
    <section className="references">
      <h2>References</h2>
      <ol>
        {references.map((ref, index) => {
          const { label, href } = normalize(ref);
          const author = typeof ref === "string" ? undefined : ref.author;
          return (
            <li key={index}>
              {href ? (
                <a rel="external" href={href}>
                  {label}
                </a>
              ) : (
                <span>{label}</span>
              )}
              {author && <span className="entry-meta"> · {author}</span>}
            </li>
          );
        })}
      </ol>
    </section>
  );
};

export default References;
