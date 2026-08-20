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

export function isURL(path: string): boolean {
  try {
    new URL(path);
    return true;
  } catch {
    return false;
  }
}

export function getImageUrl(
  path: string,
  imagePrefix = "../projects/",
  images: Record<string, { default: string }> = {} as Record<
    string,
    { default: string }
  >,
) {
  if (isURL(path)) return path;
  return images[`${imagePrefix}${path}`]?.default;
}
