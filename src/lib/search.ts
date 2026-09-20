/**
 * The index behind ⌘K.
 *
 * Titles, dates, leads, topics and reading-list notes are already in the main
 * bundle — the home, blog, project and reading pages eager-import the same
 * `?meta` and `?raw` modules — so the base index below costs nothing extra.
 * Post and project *prose* is not in the bundle, and does not need to be until
 * someone actually searches: `loadSearchIndex` pulls it in through the `?search`
 * chunks (plain text, no HTML, no highlighting) the first time the palette opens.
 */

import readingListSource from "../../reading/READING_LIST.md?raw";
import { parseReadingList } from "./readingList";
import { AFFILIATION, RESEARCH_INTERESTS } from "./site";

export type SearchKind = "post" | "project" | "reading" | "page";

export interface SearchDoc {
  id: string;
  kind: SearchKind;
  title: string;
  href: string;
  /** Off-site links (resume PDF, GitHub, papers) leave the router alone. */
  external: boolean;
  date?: string;
  /** A short label shown after the kind: topics, a hostname, a section. */
  meta?: string;
  summary: string;
  body: string;
  /** Lowercased haystacks, computed once so matching stays allocation-free. */
  lc: { title: string; meta: string; summary: string; body: string };
}

export interface SearchResult {
  doc: SearchDoc;
  score: number;
  snippet: string;
}

type MetaModule = Record<string, any>;

const postMeta = import.meta.glob("../posts/*.md", {
  eager: true,
  query: "?meta",
}) as Record<string, MetaModule>;

const projectMeta = import.meta.glob("../projects/*.md", {
  eager: true,
  query: "?meta",
}) as Record<string, MetaModule>;

const postBodies = import.meta.glob("../posts/*.md", { query: "?search" });
const projectBodies = import.meta.glob("../projects/*.md", {
  query: "?search",
});

const slugOf = (path: string) =>
  path.split("/").pop()?.replace(/\.md$/, "") ?? path;

function doc(
  fields: Omit<SearchDoc, "lc" | "external" | "body" | "summary"> &
    Partial<Pick<SearchDoc, "external" | "body" | "summary">>,
): SearchDoc {
  const full: SearchDoc = {
    external: false,
    summary: "",
    body: "",
    ...fields,
    lc: { title: "", meta: "", summary: "", body: "" },
  };
  full.lc = {
    title: full.title.toLowerCase(),
    meta: (full.meta ?? "").toLowerCase(),
    summary: full.summary.toLowerCase(),
    body: full.body.toLowerCase(),
  };
  return full;
}

const pages: SearchDoc[] = [
  doc({
    id: "page:/",
    kind: "page",
    title: "Home",
    href: "/",
    summary: `${AFFILIATION.join(". ")}. Research interests: ${RESEARCH_INTERESTS}`,
  }),
  doc({
    id: "page:/blog",
    kind: "page",
    title: "Writing",
    href: "/blog",
    summary: "All blog posts.",
  }),
  doc({
    id: "page:/projects",
    kind: "page",
    title: "Projects",
    href: "/projects",
    summary: "An index of some of my open source work.",
  }),
  doc({
    id: "page:/reading-list",
    kind: "page",
    title: "Reading list",
    href: "/reading-list",
    summary: "Papers and articles I am reading lately.",
  }),
  doc({
    id: "page:resume",
    kind: "page",
    title: "Resume",
    href: "/assets/pdf/SagnikChatterjee-Resume.pdf",
    external: true,
    summary: "CV, PDF.",
  }),
  doc({
    id: "page:github",
    kind: "page",
    title: "GitHub",
    href: "https://github.com/sagnikc395",
    external: true,
    summary: "sagnikc395 on GitHub.",
  }),
];

const byDateDesc = (a: SearchDoc, b: SearchDoc) =>
  (b.date ?? "").localeCompare(a.date ?? "");

const posts: SearchDoc[] = Object.entries(postMeta)
  .map(([path, mod]) => ({ slug: slugOf(path), ...(mod.default ?? mod) }))
  .filter((post) => !post.draft)
  .map((post) =>
    doc({
      id: `post:${post.slug}`,
      kind: "post",
      title: post.title,
      href: `/blog/${post.slug}`,
      date: post.date ? String(post.date).slice(0, 10) : undefined,
      meta: post.tags?.join(", "),
      summary: post.description || post.excerpt || "",
    }),
  )
  .sort(byDateDesc);

const projects: SearchDoc[] = Object.entries(projectMeta)
  .map(([path, mod]) => ({ slug: slugOf(path), ...(mod.default ?? mod) }))
  .map((project) =>
    doc({
      id: `project:${project.slug}`,
      kind: "project",
      title: project.title,
      href: `/project/${project.slug}`,
      date: project.date ? String(project.date).slice(0, 10) : undefined,
      meta: project.topics?.join(", "),
      summary: project.lead || project.excerpt || "",
    }),
  )
  .sort(byDateDesc);

const reading: SearchDoc[] = parseReadingList(readingListSource).map((item) =>
  doc({
    id: `reading:${item.date}:${item.url}`,
    kind: "reading",
    title: item.title,
    href: item.url,
    external: true,
    date: item.date,
    meta: item.done ? "read" : "queued",
    summary: item.note,
  }),
);

/** Everything searchable, minus the post and project prose. */
export const baseIndex: SearchDoc[] = [
  ...pages,
  ...posts,
  ...projects,
  ...reading,
];

/** What the palette lists before anything is typed. */
export const defaultDocs: SearchDoc[] = [
  ...pages.slice(0, 4),
  ...posts.slice(0, 4),
  ...projects.slice(0, 2),
];

let fullIndex: Promise<SearchDoc[]> | null = null;

/**
 * Resolves to the index with post and project bodies merged in. Safe to call on
 * every open: the fetch happens once, and the palette works off `baseIndex`
 * until it lands.
 */
export function loadSearchIndex(): Promise<SearchDoc[]> {
  fullIndex ??= (async () => {
    const bodies = new Map<string, string>();

    const read =
      (kind: "post" | "project") =>
      async ([path, load]: [string, () => Promise<unknown>]) => {
        const mod = (await load()) as {
          default?: { text?: string };
          text?: string;
        };
        const text = mod.text ?? mod.default?.text ?? "";
        if (text) bodies.set(`${kind}:${slugOf(path)}`, text);
      };

    await Promise.all([
      ...Object.entries(postBodies).map(read("post")),
      ...Object.entries(projectBodies).map(read("project")),
    ]);

    return baseIndex.map((entry) => {
      const body = bodies.get(entry.id);
      if (!body) return entry;
      return {
        ...entry,
        body,
        lc: { ...entry.lc, body: body.toLowerCase() },
      };
    });
  })();

  return fullIndex;
}

const SEPARATOR = /[^\p{L}\p{N}]+/u;

export function tokenize(query: string): string[] {
  return query.toLowerCase().split(SEPARATOR).filter(Boolean);
}

const WEIGHT = { title: 32, meta: 12, summary: 8, body: 3 };

/**
 * Scores one field. A token only counts where a word starts: without that,
 * "dpo" matches the middle of "hook_resid_post" and the results fill up with
 * coincidences.
 */
function scoreField(haystack: string, token: string, weight: number): number {
  let at = haystack.indexOf(token);
  while (at !== -1) {
    if (at === 0 || SEPARATOR.test(haystack[at - 1])) return weight;
    at = haystack.indexOf(token, at + 1);
  }
  return 0;
}

function snippetOf(entry: SearchDoc, tokens: string[]): string {
  const source = entry.body || entry.summary;
  if (!source) return "";
  const haystack = entry.body ? entry.lc.body : entry.lc.summary;

  let at = -1;
  for (const token of tokens) {
    const found = haystack.indexOf(token);
    if (found !== -1 && (at === -1 || found < at)) at = found;
  }
  if (at === -1) return entry.summary.slice(0, 180);

  let start = Math.max(0, at - 70);
  if (start > 0) {
    const space = source.indexOf(" ", start);
    if (space !== -1 && space < at) start = space + 1;
  }
  const end = Math.min(source.length, at + 140);

  return (
    (start > 0 ? "…" : "") +
    source.slice(start, end).trim() +
    (end < source.length ? "…" : "")
  );
}

/** Every token has to match somewhere; where it matches sets the ranking. */
export function searchDocs(
  docs: SearchDoc[],
  query: string,
  limit = 12,
): SearchResult[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];
  const phrase = query.trim().toLowerCase();

  const results: SearchResult[] = [];

  for (const entry of docs) {
    let score = 0;
    let matchesAll = true;

    for (const token of tokens) {
      const hit =
        scoreField(entry.lc.title, token, WEIGHT.title) +
        scoreField(entry.lc.meta, token, WEIGHT.meta) +
        scoreField(entry.lc.summary, token, WEIGHT.summary) +
        scoreField(entry.lc.body, token, WEIGHT.body);

      if (hit === 0) {
        matchesAll = false;
        break;
      }
      score += hit;
    }

    if (!matchesAll) continue;

    // Whole-phrase title matches are what people usually mean.
    if (entry.lc.title.includes(phrase)) score += 40;
    if (entry.lc.title.startsWith(phrase)) score += 20;

    results.push({ doc: entry, score, snippet: snippetOf(entry, tokens) });
  }

  results.sort((a, b) => b.score - a.score || byDateDesc(a.doc, b.doc));
  return results.slice(0, limit);
}
