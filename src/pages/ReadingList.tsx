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
  const [doneMap, setDoneMap] = useState<Record<string, boolean>>(() =>
    loadDoneMap(),
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(doneMap));
    } catch {
      // ignore quota errors
    }
  }, [doneMap]);

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

      <section className="layout-md">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-3 text-stone-100">
              Reading List
            </h1>
            <p className="text-sm md:text-lg text-stone-400">
              <em>what I am reading lately</em>
            </p>
          </div>

          {years.length > 1 && (
            <label className="text-sm text-stone-500">
              Year
              <select
                value={selectedYear}
                onChange={(event) => setSelectedYear(event.target.value)}
                className="ml-3 rounded border border-stone-700 bg-stone-900 px-3 py-2 text-stone-200"
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        {totalForYear > 0 && (
          <p className="mt-4 text-sm text-stone-500">
            {doneForYear} / {totalForYear} read
            {doneForYear > 0 && doneForYear < totalForYear
              ? ` · ${totalForYear - doneForYear} to read`
              : doneForYear === totalForYear
                ? " · all done!"
                : ""}
          </p>
        )}

        <hr className="my-8 border-stone-800" />

        {months.length === 0 ? (
          <p className="text-stone-500">No reading items yet.</p>
        ) : (
          <div className="space-y-4">
            {months.map((month, index) => (
              <details
                key={month.key}
                open={index === 0}
                className="border-b border-stone-800 pb-4"
              >
                <summary className="cursor-pointer select-none py-2 text-lg font-semibold text-stone-100 marker:text-stone-500">
                  {month.label}
                  <span className="ml-2 text-sm font-normal text-stone-500">
                    {month.items.length}
                  </span>
                </summary>

                <ol className="mt-3 space-y-4">
                  {month.items.map((item) => {
                    const done = isDone(item);
                    return (
                      <li
                        key={`${item.date}-${item.url}`}
                        className={`flex gap-3 ${done ? "opacity-60" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={done}
                          onChange={() => toggleDone(item)}
                          aria-label={`Mark "${item.title}" as ${done ? "to read" : "read"}`}
                          className="mt-1 h-4 w-4 shrink-0 accent-stone-300"
                        />
                        <div className="min-w-0 flex-1">
                          <a
                            href={item.url}
                            rel="external"
                            className={`link ${done ? "text-stone-400 line-through decoration-stone-600" : "text-stone-100"}`}
                          >
                            {item.title}
                          </a>
                          <div className="mt-1 text-sm text-stone-500">
                            {formatTime("%d %B %Y", item.date)}
                          </div>
                          {item.note && (
                            <p className="mt-2 leading-7 text-stone-400">
                              {item.note}
                            </p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </details>
            ))}
          </div>
        )}
      </section>
    </>
  );
};

export default ReadingList;
