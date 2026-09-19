/**
 * Theme setting. "system" follows the OS, "light" and "dark" pin the page.
 * The choice lives in localStorage and is written to <html data-theme>, which
 * the token blocks in app.css key off. The pre-paint half of this runs inline
 * in index.html so the first frame is already the right color; everything
 * here runs after hydration.
 */
export type Theme = "system" | "light" | "dark";

const KEY = "theme";
const EVENT = "themechange";

/** Matches --bg in each mode, for the mobile browser chrome. */
const PAGE_COLOR = { light: "#fffcf0", dark: "#100f0f" } as const;

const darkQuery = () => window.matchMedia("(prefers-color-scheme: dark)");

export function readTheme(): Theme {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    /* storage disabled; fall through to the OS preference */
  }
  return "system";
}

export function resolvedTheme(): "light" | "dark" {
  const theme = readTheme();
  if (theme !== "system") return theme;
  return darkQuery().matches ? "dark" : "light";
}

export function setTheme(theme: Theme): void {
  try {
    if (theme === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, theme);
  } catch {
    /* the page still switches for this session */
  }
  applyTheme(theme);
  window.dispatchEvent(new CustomEvent(EVENT));
}

/** Re-applies the stored choice on load. The inline script in index.html has
    already set data-theme by now; this catches the rest (the meta color). */
export function initTheme(): void {
  applyTheme(readTheme());
}

function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
  setPageColor(theme);
}

/** The first matching theme-color meta wins, so an explicit choice has to be
    inserted ahead of the media-scoped pair in index.html. */
function setPageColor(theme: Theme): void {
  const head = document.head;
  let meta = head.querySelector<HTMLMetaElement>("meta[data-theme-color]");

  if (theme === "system") {
    meta?.remove();
    return;
  }
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    meta.dataset.themeColor = "";
    head.insertBefore(meta, head.firstChild);
  }
  meta.content = PAGE_COLOR[theme];
}

/** Fires on a toggle here, an OS switch, or a toggle in another tab. */
export function subscribe(onChange: () => void): () => void {
  const media = darkQuery();

  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== KEY) return;
    applyTheme(readTheme());
    onChange();
  };

  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onStorage);
  media.addEventListener("change", onChange);

  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onStorage);
    media.removeEventListener("change", onChange);
  };
}
