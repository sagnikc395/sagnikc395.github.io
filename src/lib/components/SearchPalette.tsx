import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  baseIndex,
  defaultDocs,
  loadSearchIndex,
  searchDocs,
  tokenize,
  type SearchDoc,
  type SearchKind,
  type SearchResult,
} from "../search";
import { formatTime } from "../utils";

const KIND_LABEL: Record<SearchKind, string> = {
  post: "Writing",
  project: "Project",
  reading: "Reading",
  page: "Page",
};

/** Wraps the matched runs of `text` in <mark>, so a hit is visible in place. */
function highlight(text: string, tokens: string[]): React.ReactNode {
  if (tokens.length === 0 || !text) return text;

  const pattern = tokens
    .map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .sort((a, b) => b.length - a.length)
    .join("|");

  return text
    .split(new RegExp(`(${pattern})`, "gi"))
    .map((part, index) =>
      index % 2 === 1 ? <mark key={index}>{part}</mark> : part,
    );
}

function describe(entry: SearchDoc): string {
  const parts = [KIND_LABEL[entry.kind]];
  if (entry.date) parts.push(formatTime("%d %B %Y", entry.date));
  if (entry.meta) parts.push(entry.meta);
  return parts.join(" · ");
}

/**
 * Site-wide search, opened with ⌘K (Ctrl+K elsewhere) or the shortcut chip in
 * the nav row; the dialog is fixed, so its place in the DOM does not matter.
 */
const SearchPalette: React.FC = () => {
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [docs, setDocs] = useState<SearchDoc[]>(baseIndex);
  const [modifier, setModifier] = useState("⌘");

  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);

  const tokens = useMemo(() => tokenize(query), [query]);
  const results = useMemo<SearchResult[]>(
    () =>
      query.trim()
        ? searchDocs(docs, query)
        : defaultDocs.map((entry) => ({ doc: entry, score: 0, snippet: "" })),
    [docs, query],
  );

  /* ⌘K from anywhere. The platform check also lands here: reading it during
     render would not survive hydration. */
  useEffect(() => {
    if (!/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)) {
      setModifier("Ctrl ");
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((wasOpen) => !wasOpen);
      } else if (event.key === "Escape") {
        // The field keeps focus in practice, but Escape should shut the dialog
        // wherever focus ended up.
        setOpen(false);
        setQuery("");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  /* Opening focuses the field, pulls in the prose index, and stops the page
     behind the dialog from scrolling. */
  useEffect(() => {
    if (!open) return;

    input.current?.focus();
    void loadSearchIndex().then(setDocs);

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [open]);

  useEffect(() => setActive(0), [query]);

  /* Keep the highlighted row on screen while arrowing through a long list. */
  useEffect(() => {
    list.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  const choose = (entry: SearchDoc | undefined) => {
    if (!entry) return;
    close();
    if (entry.external) {
      window.open(entry.href, "_blank", "noopener,noreferrer");
    } else {
      navigate(entry.href);
    }
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => (results.length ? (index + 1) % results.length : 0));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) =>
        results.length ? (index - 1 + results.length) % results.length : 0,
      );
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose(results[active]?.doc);
    }
  };

  return (
    <span className="search-picker">
      <button
        type="button"
        className="search-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Search this site"
        onClick={() => setOpen(true)}
      >
        <span className="search-kbd">{modifier}K</span>
      </button>

      {open && (
        <div
          className="search-overlay"
          onPointerDown={close}
          role="presentation"
        >
          <div
            className="search-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Search this site"
            onPointerDown={(event) => event.stopPropagation()}
          >
            <input
              ref={input}
              type="text"
              className="search-input"
              placeholder="Search posts, projects and reading list…"
              value={query}
              role="combobox"
              aria-expanded={true}
              aria-controls="search-results"
              aria-activedescendant={
                results[active] ? `search-option-${active}` : undefined
              }
              aria-autocomplete="list"
              autoComplete="off"
              spellCheck={false}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={onKeyDown}
            />

            {results.length === 0 ? (
              <p className="search-empty muted">
                Nothing matches “{query.trim()}”.
              </p>
            ) : (
              <ul
                className="search-results"
                id="search-results"
                role="listbox"
                aria-label="Search results"
                ref={list}
              >
                {results.map((result, index) => (
                  <li
                    key={result.doc.id}
                    id={`search-option-${index}`}
                    role="option"
                    aria-selected={index === active}
                    className={`search-hit${index === active ? " is-active" : ""}`}
                    onMouseMove={() => setActive(index)}
                    onClick={() => choose(result.doc)}
                  >
                    <span className="search-hit-title">
                      {highlight(result.doc.title, tokens)}
                      {result.doc.external && (
                        <span
                          className="search-hit-external"
                          aria-hidden="true"
                        >
                          {" ↗"}
                        </span>
                      )}
                    </span>
                    <span className="search-hit-meta small muted">
                      {describe(result.doc)}
                    </span>
                    {result.snippet && (
                      <span className="search-hit-snippet small muted">
                        {highlight(result.snippet, tokens)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <p className="search-hint small muted">
              <span>↑↓ to move</span>
              <span>↵ to open</span>
              <span>esc to close</span>
            </p>
          </div>
        </div>
      )}
    </span>
  );
};

export default SearchPalette;
