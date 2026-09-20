/**
 * Notes are matched to reading-list rows by URL, and the two files are written
 * by hand at different times, so the matching has to survive abs/pdf and version
 * suffixes. These assertions pin that down, plus the frontmatter every note page
 * needs to render.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import { load } from "js-yaml";
import { paperKey, parseReadingList } from "../src/lib/readingList.ts";
import { isoDate } from "../src/lib/utils.ts";

// arXiv: /abs and /pdf, version suffixes and .pdf extensions are the same paper.
const arxivForms = [
  "https://arxiv.org/abs/2305.18290",
  "https://arxiv.org/pdf/2305.18290",
  "http://www.arxiv.org/pdf/2305.18290v3",
  "https://arxiv.org/pdf/2305.18290.pdf",
];
const keys = new Set(arxivForms.map(paperKey));
assert.equal(keys.size, 1, `arXiv forms should collapse: ${[...keys]}`);
assert.equal(paperKey(arxivForms[0]), "arxiv:2305.18290");

// Old-style arXiv ids still collapse.
assert.equal(
  paperKey("https://arxiv.org/abs/cs.LG/0123456"),
  paperKey("https://arxiv.org/pdf/cs.LG/0123456v2"),
);

// Different papers stay different.
assert.notEqual(
  paperKey("https://arxiv.org/abs/2305.18290"),
  paperKey("https://arxiv.org/abs/2210.01790"),
);

// Non-arXiv hosts normalise on protocol, www, trailing slash, query and .pdf.
assert.equal(
  paperKey("https://proceedings.mlr.press/v15/ross11a/ross11a.pdf"),
  paperKey("http://www.proceedings.mlr.press/v15/ross11a/ross11a/?utm=x"),
);
assert.equal(
  paperKey("https://example.com/a"),
  "example.com/a",
  "bare host + path is the fallback key",
);
assert.notEqual(
  paperKey("https://example.com/a"),
  paperKey("https://example.com/b"),
);

// Every note file carries what the note page and index render.
const notesDir = new URL("../src/notes/", import.meta.url);
const files = fs
  .readdirSync(notesDir)
  .filter((name) => name.endsWith(".md"))
  .sort();

const readingSource = fs.readFileSync(
  new URL("../reading/READING_LIST.md", import.meta.url),
  "utf8",
);
const readingKeys = new Set(
  parseReadingList(readingSource).map((item) => paperKey(item.url)),
);

const seen = new Map<string, string>();

for (const name of files) {
  const source = fs.readFileSync(new URL(name, notesDir), "utf8");
  assert.ok(source.startsWith("---"), `${name}: missing frontmatter`);

  const end = source.indexOf("---", 3);
  assert.notEqual(end, -1, `${name}: unclosed frontmatter`);
  const meta = load(source.slice(3, end).trim()) as Record<string, unknown>;

  assert.ok(meta.title, `${name}: needs a title`);
  assert.ok(meta.date, `${name}: needs a date`);
  assert.match(
    isoDate(meta.date as Date | string),
    /^\d{4}-\d{2}-\d{2}$/,
    `${name}: date should be YYYY-MM-DD`,
  );

  if (!meta.paper) continue;
  const key = paperKey(String(meta.paper));

  const other = seen.get(key);
  assert.equal(other, undefined, `${name} and ${other} claim the same paper`);
  seen.set(key, name);

  // A note about something that is not on the list is allowed, but it is
  // almost always a typo in the URL, so say so loudly.
  if (!readingKeys.has(key)) {
    console.warn(`  warn: ${name} -> ${meta.paper} is not in the reading list`);
  }
}

console.log(`checked ${files.length} notes`);
