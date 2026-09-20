import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import Seo from "../lib/components/Seo";
import { formatTime, isoDate } from "../lib/utils";
import { notes, type NoteEntry } from "../lib/notes";

/** Groups notes by year, newest first, the way the reading list groups by month. */
function byYear(entries: NoteEntry[]): { year: string; items: NoteEntry[] }[] {
  return entries.reduce<{ year: string; items: NoteEntry[] }[]>(
    (years, note) => {
      const year = isoDate(note.date).slice(0, 4);
      const current = years.at(-1);
      if (current?.year === year) {
        current.items.push(note);
        return years;
      }
      years.push({ year, items: [note] });
      return years;
    },
    [],
  );
}

const Notes: React.FC = () => {
  const years = useMemo(() => byYear(notes), []);

  return (
    <>
      <Seo
        title="Sagnik Chatterjee - Notes"
        description="Notes on, and my understanding of, the papers in my reading list"
      />

      <section className="wrap">
        <h2>Notes</h2>
        <p className="muted">
          What I took away from the papers on my{" "}
          <Link to="/reading-list">reading list</Link>.
        </p>

        {notes.length === 0 ? (
          <p className="muted">No notes yet.</p>
        ) : (
          years.map((group) => (
            <React.Fragment key={group.year}>
              <h3 className="reading-section">{group.year}</h3>
              <ul className="entries">
                {group.items.map((note) => (
                  <li key={note.slug}>
                    <Link to={`/notes/${note.slug}`} className="entry-title">
                      {note.title}
                    </Link>
                    <br />
                    <span className="entry-meta small">
                      {formatTime("%d %B %Y", note.date)}
                      {note.venue && ` · ${note.venue}`}
                    </span>
                    {note.excerpt && (
                      <p className="entry-note">{note.excerpt}</p>
                    )}
                  </li>
                ))}
              </ul>
            </React.Fragment>
          ))
        )}
      </section>
    </>
  );
};

export default Notes;
