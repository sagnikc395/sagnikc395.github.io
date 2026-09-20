import React, { useEffect, useReducer, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Seo from "../lib/components/Seo";
import Markdown from "../lib/components/Markdown";
import References from "../lib/components/References";
import { loadContent, peekContent } from "../lib/content";
import type { Note } from "../lib/types";
import { formatTime } from "../lib/utils";

const LinkPopups = React.lazy(() => import("../lib/components/LinkPopups"));

const NotePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const article = useRef<HTMLElement>(null);

  // Same deal as BlogPost: already cached on the prerendered route, so the
  // first render matches the server. Only client-side navigation awaits.
  const note = slug ? peekContent<Note>("note", slug) : null;

  useEffect(() => {
    if (!slug || note !== undefined) return;
    let active = true;
    void loadContent<Note>("note", slug).then(() => {
      if (active) rerender();
    });
    return () => {
      active = false;
    };
  }, [slug, note]);

  useEffect(() => {
    if (note === null || note?.draft) navigate("/404", { replace: true });
  }, [note, navigate]);

  if (!note || note.draft) return null;

  return (
    <>
      <Seo
        title={note.title}
        description={`Reading note: ${note.title}`}
        keywords={note.tags}
      />

      <article className="wrap" ref={article}>
        <h2>{note.title}</h2>
        <p className="entry-meta small">
          {formatTime("%d %B %Y", note.date)}
          {note.venue && ` · ${note.venue}`}
        </p>

        {(note.paper || note.authors) && (
          <dl className="kv note-source small">
            {note.paper && (
              <>
                <dt>Paper</dt>
                <dd>
                  <a className="link" rel="external" href={note.paper}>
                    {note.paper.replace(/^https?:\/\/(www\.)?/, "")}
                  </a>
                </dd>
              </>
            )}
            {note.authors && (
              <>
                <dt>Authors</dt>
                <dd>{note.authors}</dd>
              </>
            )}
          </dl>
        )}

        <Markdown source={note.content} />

        <References references={note.references} />

        <p className="entry-meta small note-back">
          <Link to="/notes">All notes</Link>
          <span className="sep" aria-hidden="true">
            {" | "}
          </span>
          <Link to="/reading-list">Reading list</Link>
        </p>

        <React.Suspense fallback={null}>
          <LinkPopups containerRef={article} />
        </React.Suspense>
      </article>
    </>
  );
};

export default NotePage;
