import React, { useMemo, useState } from "react";
import Seo from "../lib/components/Seo";
import { formatTime } from "../lib/utils";
import {
  groupReadingMonths,
  parseReadingList,
  splitReadingByStatus,
  type ReadingItem,
  type ReadingMonth,
} from "../lib/readingList";
import readingListSource from "../../reading/READING_LIST.md?raw";

function MonthList({
  months,
  openFirst,
}: {
  months: ReadingMonth[];
  openFirst: boolean;
}) {
  return (
    <>
      {months.map((month, index) => (
        <details
          key={month.key}
          open={openFirst && index === 0}
          className="reading-month"
        >
          <summary>
            {month.label}{" "}
            <span className="entry-meta small">({month.items.length})</span>
          </summary>

          <ul className="entries">
            {month.items.map((item: ReadingItem) => (
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
      ))}
    </>
  );
}

// The list is read-only: an item moves to "Completed" only when it is marked
// [x] (or "(Completed)") in reading/READING_LIST.md. There is no per-visitor
// state to save.
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

  const { reading, completed } = useMemo(
    () => splitReadingByStatus(filteredItems),
    [filteredItems],
  );

  const readingMonths = useMemo(() => groupReadingMonths(reading), [reading]);
  const completedMonths = useMemo(
    () => groupReadingMonths(completed),
    [completed],
  );

  const totalForYear = filteredItems.length;
  const doneForYear = completed.length;

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

        {totalForYear === 0 ? (
          <p className="muted">No reading items yet.</p>
        ) : (
          <>
            <h3 className="reading-section">To be read</h3>
            {readingMonths.length === 0 ? (
              <p className="muted">Nothing queued.</p>
            ) : (
              <MonthList months={readingMonths} openFirst />
            )}

            <h3 className="reading-section">Completed</h3>
            {completedMonths.length === 0 ? (
              <p className="muted">Nothing finished yet.</p>
            ) : (
              <MonthList months={completedMonths} openFirst={false} />
            )}
          </>
        )}
      </section>
    </>
  );
};

export default ReadingList;
