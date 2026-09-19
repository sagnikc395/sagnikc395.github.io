import React, { useMemo, useState } from "react";
import Seo from "../lib/components/Seo";
import { formatTime } from "../lib/utils";
import {
  groupReadingMonths,
  parseReadingList,
  type ReadingMonth,
} from "../lib/readingList";
import readingListSource from "../../reading/READING_LIST.md?raw";

// The list is read-only: an item is "read" only when it is marked [x] in
// reading/READING_LIST.md. There is no per-visitor state to save.
const ReadingList: React.FC = () => {
  const items = useMemo(() => parseReadingList(readingListSource), []);
  const years = useMemo(
    () => [...new Set(items.map((item) => item.date.slice(0, 4)))],
    [items],
  );
  const [selectedYear, setSelectedYear] = useState(years[0] ?? "");

  const filteredItems = useMemo(
    () => items.filter((item) => item.date.startsWith(selectedYear)),
    [items, selectedYear],
  );

  const months = useMemo<ReadingMonth[]>(
    () => groupReadingMonths(filteredItems),
    [filteredItems],
  );

  const totalForYear = filteredItems.length;
  const doneForYear = filteredItems.filter((item) => item.done).length;

  return (
    <>
      <Seo
        title="Sagnik Chatterjee - Reading List"
        description="What I am reading lately"
      />

      <section className="wrap">
        <h2>Reading list</h2>
        <p className="muted">
          What I am reading lately.
          {totalForYear > 0 && (
            <>
              {" "}
              {doneForYear} of {totalForYear} read in {selectedYear}.
            </>
          )}
        </p>

        {years.length > 1 && (
          <p>
            <label>
              Year{" "}
              <select
                value={selectedYear}
                onChange={(event) => setSelectedYear(event.target.value)}
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>
          </p>
        )}

        {months.length === 0 ? (
          <p className="muted">No reading items yet.</p>
        ) : (
          months.map((month, index) => (
            <details
              key={month.key}
              open={index === 0}
              className="reading-month"
            >
              <summary>
                {month.label}{" "}
                <span className="entry-meta small">({month.items.length})</span>
              </summary>

              <ul className="entries">
                {month.items.map((item) => (
                  <li
                    key={`${item.date}-${item.url}`}
                    className={`reading-item${item.done ? " is-done" : ""}`}
                  >
                    <div>
                      <a className="entry-link" href={item.url} rel="external">
                        {item.title}
                      </a>
                      <br />
                      <span className="entry-meta small">
                        {formatTime("%d %B %Y", item.date)}
                      </span>
                      {item.note && <p className="entry-note">{item.note}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </details>
          ))
        )}
      </section>
    </>
  );
};

export default ReadingList;
