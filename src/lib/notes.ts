/**
 * Notes are my own write-ups of the references in reading/READING_LIST.md: one
 * Markdown file per reference, in src/notes/.
 *
 * Titles, dates and paper links are eager — the notes index, the reading list
 * and the search palette all need them up front, and they are a few hundred
 * bytes each. The prose itself stays code-split through src/lib/content.ts.
 */

import { paperKey } from "./readingList";
import { isoDate } from "./utils";
import type { NoteMeta } from "./types";

const meta = import.meta.glob("../notes/*.md", {
  eager: true,
  query: "?meta",
}) as Record<string, { default?: NoteMeta } & NoteMeta>;

export interface NoteEntry extends NoteMeta {
  slug: string;
}

export const notes: NoteEntry[] = Object.entries(meta)
  .map(([path, mod]) => {
    const fields = mod.default ?? mod;
    return {
      ...fields,
      slug: path.split("/").pop()?.replace(/\.md$/, "") ?? path,
    };
  })
  .filter((note) => !note.draft)
  .sort((a, b) => isoDate(b.date).localeCompare(isoDate(a.date)));

const byPaper = new Map<string, NoteEntry>();
for (const note of notes) {
  if (!note.paper) continue;
  const key = paperKey(note.paper);
  // First writer wins, so the newest note for a paper is the one linked to.
  if (!byPaper.has(key)) byPaper.set(key, note);
}

/** The note written about a given reference URL, if there is one. */
export function noteFor(url: string): NoteEntry | undefined {
  return byPaper.get(paperKey(url));
}
