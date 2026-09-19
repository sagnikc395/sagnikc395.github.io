/**
 * The data behind the link previews.
 *
 * Both sources resolve at build time, so opening a preview never costs a
 * network request. Internal links reuse the same `?meta` frontmatter the
 * listing pages already import; off-site links come from src/annotations.yaml,
 * which `npm run annotations` fills in from arXiv/GitHub/Crossref/OpenGraph and
 * which is meant to be hand-edited on top of that.
 */
import { formatTime } from "./utils";

export type Annotation = {
  /** Where the preview came from; drives which fields the card shows. */
  kind: "post" | "project" | "section" | "external" | "bare";
  title: string;
  href: string;
  /** "Writing", "Project", or the host for off-site links. */
  source?: string;
  author?: string;
  /** Already formatted for display. */
  date?: string;
  body?: string;
};

type Entry = {
  title?: string;
  author?: string;
  date?: string;
  abstract?: string;
};

// Loaded through a glob rather than a plain import: TypeScript's `*.yaml`
// declaration only covers non-relative specifiers, and the glob is typed.
const [table] = Object.values(
  import.meta.glob("../annotations.yaml", { eager: true, import: "default" }),
);

const entries = (table as Record<string, Entry> | undefined) ?? {};

type Meta = {
  title?: string;
  date?: string;
  excerpt?: string;
  draft?: boolean;
};

const unwrap = (mod: unknown): Meta => {
  const m = mod as { default?: Meta } & Meta;
  return m.default ?? m;
};

const local: Record<"post" | "project", Record<string, Meta>> = {
  post: {},
  project: {},
};

for (const [path, mod] of Object.entries(
  import.meta.glob("../posts/*.md", { eager: true, query: "?meta" }),
)) {
  const slug = path.slice("../posts/".length, -".md".length);
  local.post[slug] = unwrap(mod);
}

for (const [path, mod] of Object.entries(
  import.meta.glob("../projects/*.md", { eager: true, query: "?meta" }),
)) {
  const slug = path.slice("../projects/".length, -".md".length);
  local.project[slug] = unwrap(mod);
}

/** Lookup keys to try, most specific first: exact, then without the fragment,
    then without a trailing slash, then without an arXiv version suffix. */
function keysFor(href: string): string[] {
  const keys = [href];
  const hash = href.indexOf("#");
  if (hash > 0) keys.push(href.slice(0, hash));

  for (const key of [...keys]) {
    if (key.endsWith("/")) keys.push(key.slice(0, -1));
    const unversioned = key.replace(/(arxiv\.org\/abs\/[\d.]+)v\d+$/i, "$1");
    if (unversioned !== key) keys.push(unversioned);
  }

  return keys;
}

function host(href: string): string | undefined {
  try {
    return new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

/** ISO dates get the site's usual long form; anything else ("2024", "Spring
    2019") is shown as written. */
function displayDate(date?: string): string | undefined {
  if (!date) return undefined;
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? formatTime("%d %B %Y", date) : date;
}

/** The annotation for a link, or null when it should get no preview at all. */
export function annotationFor(href: string): Annotation | null {
  if (!href || href.startsWith("#")) return null;

  const post = href.match(/^\/blog\/([^/#?]+)\/?/);
  const project = href.match(/^\/project\/([^/#?]+)\/?/);

  for (const [kind, match] of [
    ["post", post],
    ["project", project],
  ] as const) {
    if (!match) continue;
    const meta = local[kind][decodeURIComponent(match[1])];
    if (!meta || meta.draft) return null;
    return {
      kind,
      href,
      title: meta.title ?? match[1],
      source: kind === "post" ? "Writing" : "Project",
      date: meta.date ? formatTime("%d %B %Y", meta.date) : undefined,
      body: meta.excerpt,
    };
  }

  // Anything else on this site (the resume PDF, static assets) has nothing
  // worth previewing.
  if (!/^https?:\/\//i.test(href)) return null;

  const entry = keysFor(href)
    .map((key) => entries[key])
    .find(Boolean);

  if (!entry) {
    // No annotation written yet: the card still answers "where does this go?".
    return { kind: "bare", href, title: href, source: host(href) };
  }

  return {
    kind: "external",
    href,
    title: entry.title ?? href,
    source: host(href),
    author: entry.author,
    date: displayDate(entry.date),
    body: entry.abstract,
  };
}
