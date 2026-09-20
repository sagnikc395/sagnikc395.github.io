import assert from "node:assert/strict";
import fs from "node:fs";
import {
  groupReadingMonths,
  parseReadingList,
  splitReadingByStatus,
} from "../src/lib/readingList.ts";

const items = parseReadingList(`
- 2025-02-01 [Older item](https://example.com/older) - note
- 2026-08-25 https://example.com/latest
- 2026-02-31 https://example.com/bad-date
- not dated
`);

assert.deepEqual(
  items.map((item) => item.date),
  ["2026-08-25", "2025-02-01"],
);
assert.equal(items[0].title, "example.com");
assert.equal(items[1].note, "note");
assert.deepEqual(
  groupReadingMonths(items).map((month) => month.key),
  ["2026-08", "2025-02"],
);

// checklist support
const checklist = parseReadingList(`
- [x] 2026-08-25 [Done item](https://example.com/done)
- [ ] 2026-08-24 [Todo item](https://example.com/todo)
- 2026-08-23 [Bare item](https://example.com/bare)
- [X] 2026-08-22 https://example.com/upper
* [x] 2026-08-21 [Star bullet](https://example.com/star)
`);
assert.equal(checklist.find((i) => i.date === "2026-08-25")?.done, true);
assert.equal(checklist.find((i) => i.date === "2026-08-24")?.done, false);
assert.equal(checklist.find((i) => i.date === "2026-08-23")?.done, false);
assert.equal(checklist.find((i) => i.date === "2026-08-22")?.done, true);
assert.equal(checklist.find((i) => i.date === "2026-08-21")?.done, true);

// "(Completed)" marker is an alias for [x]
const worded = parseReadingList(`
- (Completed) 2026-08-30 [Worded](https://example.com/worded)
- (completed) 2026-08-29 [Lowercase](https://example.com/lower)
- (Done) 2026-08-28 [Done word](https://example.com/done-word)
- 2026-08-27 [Plain](https://example.com/plain)
`);
assert.equal(worded.length, 4, "worded markers still parse as items");
assert.equal(worded.find((i) => i.date === "2026-08-30")?.done, true);
assert.equal(worded.find((i) => i.date === "2026-08-29")?.done, true);
assert.equal(worded.find((i) => i.date === "2026-08-28")?.done, true);
assert.equal(worded.find((i) => i.date === "2026-08-27")?.done, false);
assert.equal(worded.find((i) => i.date === "2026-08-30")?.title, "Worded");

// completed items split out into their own section
const split = splitReadingByStatus(checklist);
assert.deepEqual(
  split.completed.map((i) => i.date),
  ["2026-08-25", "2026-08-22", "2026-08-21"],
);
assert.deepEqual(
  split.reading.map((i) => i.date),
  ["2026-08-24", "2026-08-23"],
);

// file moved to reading/READING_LIST.md
const readingPath = new URL("../reading/READING_LIST.md", import.meta.url);
assert.ok(fs.existsSync(readingPath), "reading/READING_LIST.md should exist");
const legacyPath = new URL("../READING_LIST.md", import.meta.url);
assert.ok(
  !fs.existsSync(legacyPath),
  "legacy READING_LIST.md should not exist",
);
const source = fs.readFileSync(readingPath, "utf8");
assert.ok(parseReadingList(source).length >= 0, "reading list parses");
