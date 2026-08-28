export interface ReadingItem {
  date: string;
  title: string;
  url: string;
  note: string;
  done: boolean;
}

export interface ReadingMonth {
  key: string;
  label: string;
  items: ReadingItem[];
}

const monthName = new Intl.DateTimeFormat("en-US", {
  month: "long",
  timeZone: "UTC",
});

function validDate(date: string): boolean {
  const parsed = new Date(`${date}T00:00:00Z`);
  return (
    !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(date)
  );
}

function hostname(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function parseReadingList(source: string): ReadingItem[] {
  return source
    .split("\n")
    .map((line) => {
      const item = line.match(
        /^\s*[-*]\s+(?:\[([ xX])\]\s+)?(\d{4}-\d{2}-\d{2})\s+(.+)$/,
      );
      if (!item) return null;

      const [, check, date, body] = item;
      const done = check ? check.toLowerCase() === "x" : false;
      if (!validDate(date)) return null;

      const markdownLink = body.match(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/);
      const plainLink = body.match(/https?:\/\/\S+/);
      const url = markdownLink?.[2] ?? plainLink?.[0]?.replace(/[),.;]+$/, "");
      const host = url ? hostname(url) : null;
      if (!url || !host) return null;

      const title = markdownLink?.[1]?.trim() || host;
      const note = body
        .replace(markdownLink?.[0] ?? plainLink?.[0] ?? url, "")
        .replace(/^[-:,\s]+/, "")
        .trim();

      return { date, title, url, note, done };
    })
    .filter((item): item is ReadingItem => Boolean(item))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function groupReadingMonths(items: ReadingItem[]): ReadingMonth[] {
  return [...items]
    .sort((a, b) => b.date.localeCompare(a.date))
    .reduce<ReadingMonth[]>((months, item) => {
      const key = item.date.slice(0, 7);
      const current = months.at(-1);
      if (current?.key === key) {
        current.items.push(item);
        return months;
      }

      const date = new Date(`${item.date}T00:00:00Z`);
      months.push({
        key,
        label: `${monthName.format(date)} ${item.date.slice(0, 4)}`,
        items: [item],
      });
      return months;
    }, []);
}
