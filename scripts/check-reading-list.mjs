import assert from "node:assert/strict";
import {
  groupReadingMonths,
  parseReadingList,
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
