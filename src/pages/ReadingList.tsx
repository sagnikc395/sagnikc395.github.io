import React, { useEffect, useMemo, useState } from "react";
import Seo from "../lib/components/Seo";
import { formatTime } from "../lib/utils";
import {
  groupReadingMonths,
  parseReadingList,
  type ReadingItem,
  type ReadingMonth,
} from "../lib/readingList";
import readingListSource from "../../reading/READING_LIST.md?raw";

const STORAGE_KEY = "reading-list:done";

function itemKey(item: Pick<ReadingItem, "date" | "url">): string {
  return `${item.date}::${item.url}`;
}

function loadDoneMap(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

const ReadingList: React.FC = () => {
  const items = useMemo(() => parseReadingList(readingListSource), []);
  const years = useMemo(
    () => [...new Set(items.map((item) => item.date.slice(0, 4)))],
    [items],
  );
  const [selectedYear, setSelectedYear] = useState(years[0] ?? "");
  // Read localStorage after mount, not during the first render: the prerendered
  // HTML can only reflect the file's own checkmarks, so the client has to agree
  // on that for one render before layering the reader's own state on top.
  const [doneMap, setDoneMap] = useState<Record<string, boolean>>({});
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    setDoneMap(loadDoneMap());
    setRestored(true);
  }, []);

  useEffect(() => {
    if (!restored) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(doneMap));
    } catch {
      // ignore quota errors
    }
  }, [doneMap, restored]);

  const isDone = (item: ReadingItem) => {
    const k = itemKey(item);
    return k in doneMap ? doneMap[k] : item.done;
  };

  const toggleDone = (item: ReadingItem) => {
    const k = itemKey(item);
    setDoneMap((prev) => ({
      ...prev,
      [k]: !(k in prev ? prev[k] : item.done),
    }));
  };

  // items filtered by year, with effective done considered for grouping? grouping is by date only
  const filteredItems = useMemo(
    () => items.filter((item) => item.date.startsWith(selectedYear)),
    [items, selectedYear],
  );

  const months = useMemo<ReadingMonth[]>(
    () => groupReadingMonths(filteredItems),
    [filteredItems],
  );

  const totalForYear = filteredItems.length;
  const doneForYear = useMemo(
    () =>
      filteredItems.filter((item) => {
        const k = itemKey(item);
        return k in doneMap ? doneMap[k] : item.done;
      }).length,
    [filteredItems, doneMap],
  );

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
                {month.items.map((item) => {
                  const done = isDone(item);
                  return (
                    <li
                      key={`${item.date}-${item.url}`}
                      className={`reading-item${done ? " is-done" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={done}
                        onChange={() => toggleDone(item)}
                        aria-label={`Mark "${item.title}" as ${done ? "to read" : "read"}`}
                      />
                      <div>
                        <a
                          className="entry-link"
                          href={item.url}
                          rel="external"
                        >
                          {item.title}
                        </a>
                        <br />
                        <span className="entry-meta small">
                          {formatTime("%d %B %Y", item.date)}
                        </span>
                        {item.note && <p className="entry-note">{item.note}</p>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </details>
          ))
        )}
      </section>
    </>
  );
};

export default ReadingList;
