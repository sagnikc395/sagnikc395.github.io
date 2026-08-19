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
    <footer className="mt-12 border-t border-stone-700 border-dotted pt-6">
      <h2 className="text-stone-100 text-lg font-semibold mb-4">References</h2>
      <ol className="list-decimal list-inside space-y-2 text-stone-300">
        {references.map((ref, index) => {
          const { label, href } = normalize(ref);
          const author = typeof ref === "string" ? undefined : ref.author;
          return (
            <li key={index} className="break-words">
              {href ? (
                <a className="link" rel="external" href={href}>
                  {label}
                </a>
              ) : (
                <span>{label}</span>
              )}
              {author && <span className="text-stone-400"> — {author}</span>}
            </li>
          );
        })}
      </ol>
    </footer>
  );
};

export default References;
