const longUtcDate = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const utcYear = new Intl.DateTimeFormat("en", {
  year: "numeric",
  timeZone: "UTC",
});

export function formatTime(format: string, date: Date | string): string {
  const value = new Date(date);

  if (format === "%Y") {
    return utcYear.format(value);
  }

  return longUtcDate.format(value);
}
