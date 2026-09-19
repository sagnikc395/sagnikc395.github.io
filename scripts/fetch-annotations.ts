/**
 * Fills in src/annotations.yaml, the text behind the link previews.
 *
 * Walks every link in src/posts and src/projects (body links and frontmatter
 * references alike) and asks the obvious source for a title, author, date and
 * abstract: the arXiv API for papers, the GitHub API for repos, Crossref for
 * DOIs, and the page's own OpenGraph tags for everything else. Entries already
 * in the file are left alone unless you pass --refresh, so hand-written
 * annotations survive.
 *
 *   node scripts/fetch-annotations.ts [--refresh] [--only <substring>]
 *
 * The build never runs this: it is a network job whose output is committed.
 */
import { readFile, writeFile, readdir } from "node:fs/promises";
import path from "node:path";
import { load, dump } from "js-yaml";

type Entry = {
  title?: string;
  author?: string;
  date?: string;
  abstract?: string;
};

const OUT = "src/annotations.yaml";
const DIRS = ["src/posts", "src/projects"];
const UA = "sagnikc395.github.io annotation fetcher";
const ABSTRACT_WORDS = 90;

const args = process.argv.slice(2);
const refresh = args.includes("--refresh");
const only = args[args.indexOf("--only") + 1];

function tidy(text: string, maxWords = ABSTRACT_WORDS): string {
  const words = text
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ");
  return (
    words.slice(0, maxWords).join(" ") + (words.length > maxWords ? "…" : "")
  );
}

function decodeEntities(text: string): string {
  const named: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
    mdash: "—",
    ndash: "–",
    hellip: "…",
  };
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCharCode(parseInt(code, 16)),
    )
    .replace(
      /&([a-z]+);/gi,
      (match, name) => named[name.toLowerCase()] ?? match,
    );
}

/** Every off-site link in the content, in the order encountered. */
async function collectLinks(): Promise<string[]> {
  const urls = new Set<string>();

  for (const dir of DIRS) {
    for (const file of await readdir(dir)) {
      if (!file.endsWith(".md")) continue;
      const src = await readFile(path.join(dir, file), "utf8");

      // Body links, minus images (those are ![...](...)).
      for (const match of src.matchAll(/(!?)\[[^\]]*\]\(([^)\s]+)/g)) {
        if (match[1] === "!") continue;
        urls.add(match[2]);
      }
      // Frontmatter reference urls, and bare-string references.
      for (const match of src.matchAll(/^\s*(?:-\s*)?url:\s*(\S+)/gm)) {
        urls.add(match[1].replace(/^["']|["']$/g, ""));
      }
    }
  }

  return [...urls].filter(
    (url) =>
      /^https?:\/\//i.test(url) &&
      !/\.(png|jpe?g|gif|webp|svg)$/i.test(url) &&
      (!only || url.includes(only)),
  );
}

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

async function getText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "user-agent": UA, accept: "*/*" },
      redirect: "follow",
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function getJson<T>(url: string): Promise<T | null> {
  const text = await getText(url);
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

const tag = (xml: string, name: string): string | undefined =>
  xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`))?.[1]?.trim();

async function fromArxiv(id: string): Promise<Entry | null> {
  // arXiv rate-limits hard and answers an empty feed rather than an error, so
  // give it a couple of tries with a pause in between.
  let entry: string | undefined;
  for (let attempt = 0; attempt < 3 && !entry; attempt += 1) {
    if (attempt) await sleep(3000);
    const xml = await getText(
      `https://export.arxiv.org/api/query?id_list=${encodeURIComponent(id)}`,
    );
    entry = xml?.split("<entry>")[1];
  }
  if (!entry) return fromArxivPage(id);

  const authors = [...entry.matchAll(/<name>([\s\S]*?)<\/name>/g)].map((m) =>
    m[1].trim(),
  );

  return {
    title: tidy(decodeEntities(tag(entry, "title") ?? ""), 40) || undefined,
    author:
      authors.length > 3
        ? `${authors[0]} et al.`
        : authors.join(", ") || undefined,
    date: tag(entry, "published")?.slice(0, 10),
    abstract: tidy(decodeEntities(tag(entry, "summary") ?? "")) || undefined,
  };
}

/** When the API is rate-limiting, the abstract page carries the same fields in
    its citation_* meta tags. */
async function fromArxivPage(id: string): Promise<Entry | null> {
  const html = await getText(`https://arxiv.org/abs/${id}`);
  if (!html) return null;

  const meta = (name: string) =>
    html.match(new RegExp(`<meta name="${name}" content="([^"]*)"`, "i"))?.[1];

  const title = meta("citation_title");
  if (!title) return null;

  // citation_author is "Family, Given", one tag per author.
  const authors = [
    ...html.matchAll(/<meta name="citation_author" content="([^"]*)"/gi),
  ].map((m) => {
    const [family, given] = m[1].split(",").map((part) => part.trim());
    return given ? `${given} ${family}` : family;
  });

  return {
    title: tidy(decodeEntities(title), 40),
    author:
      authors.length > 3
        ? `${authors[0]} et al.`
        : authors.join(", ") || undefined,
    date: meta("citation_date")?.replace(/\//g, "-"),
    abstract: meta("citation_abstract")
      ? tidy(decodeEntities(meta("citation_abstract")!))
      : undefined,
  };
}

async function fromGithub(repo: string): Promise<Entry | null> {
  const data = await getJson<{
    full_name?: string;
    description?: string;
    language?: string;
    pushed_at?: string;
    owner?: { login?: string };
  }>(`https://api.github.com/repos/${repo}`);
  if (!data?.full_name) return null;

  return {
    title: data.full_name,
    author: data.owner?.login,
    date: data.pushed_at?.slice(0, 10),
    abstract: [
      data.description,
      data.language && `Written in ${data.language}.`,
    ]
      .filter(Boolean)
      .join(" "),
  };
}

async function fromCrossref(doi: string): Promise<Entry | null> {
  const data = await getJson<{
    message?: {
      title?: string[];
      author?: { given?: string; family?: string }[];
      abstract?: string;
      issued?: { "date-parts"?: number[][] };
    };
  }>(`https://api.crossref.org/works/${encodeURIComponent(doi)}`);
  const work = data?.message;
  if (!work?.title?.[0]) return null;

  const authors = (work.author ?? []).map((a) =>
    [a.given, a.family].filter(Boolean).join(" "),
  );
  const parts = work.issued?.["date-parts"]?.[0];

  return {
    title: tidy(decodeEntities(work.title[0]), 40),
    author:
      authors.length > 3
        ? `${authors[0]} et al.`
        : authors.join(", ") || undefined,
    date: parts
      ? parts
          .slice(0, 3)
          .map((n, i) => (i ? String(n).padStart(2, "0") : String(n)))
          .join("-")
      : undefined,
    abstract: work.abstract ? tidy(decodeEntities(work.abstract)) : undefined,
  };
}

async function fromOpenGraph(url: string): Promise<Entry | null> {
  const html = await getText(url);
  if (!html) return null;

  const meta = (property: string) =>
    html.match(
      new RegExp(
        `<meta[^>]+(?:property|name)=["']${property}["'][^>]*content=["']([^"']*)["']`,
        "i",
      ),
    )?.[1] ??
    html.match(
      new RegExp(
        `<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${property}["']`,
        "i",
      ),
    )?.[1];

  const title = meta("og:title") ?? tag(html, "title");
  const description = meta("og:description") ?? meta("description");
  if (!title && !description) return null;

  return {
    title: title ? tidy(decodeEntities(title), 40) : undefined,
    author: meta("article:author") ?? meta("author"),
    date: meta("article:published_time")?.slice(0, 10),
    abstract: description ? tidy(decodeEntities(description)) : undefined,
  };
}

async function annotate(url: string): Promise<Entry | null> {
  const arxiv = url.match(/arxiv\.org\/(?:abs|pdf)\/([\w.\-/]+?)(?:v\d+)?$/i);
  if (arxiv) return fromArxiv(arxiv[1]);

  const github = url.match(/^https?:\/\/github\.com\/([^/]+\/[^/#?]+)\/?$/i);
  if (github) return fromGithub(github[1].replace(/\.git$/, ""));

  const doi = url.match(/doi\.org\/(10\.[^\s?#]+)/i);
  if (doi) return fromCrossref(doi[1]);

  return fromOpenGraph(url);
}

const existing = (load(await readFile(OUT, "utf8").catch(() => "")) ??
  {}) as Record<string, Entry>;

const urls = await collectLinks();
const table: Record<string, Entry> = { ...existing };
let added = 0;
let missed = 0;

for (const url of urls) {
  if (existing[url] && !refresh) continue;

  const entry = await annotate(url);
  await sleep(500);
  if (!entry || (!entry.title && !entry.abstract)) {
    console.warn(`  no metadata: ${url}`);
    missed += 1;
    continue;
  }

  // Drop empty fields so the file stays readable.
  table[url] = Object.fromEntries(
    Object.entries(entry).filter(([, value]) => value),
  );
  added += 1;
  console.log(`  ${url}\n    ${entry.title ?? ""}`);
}

const sorted = Object.fromEntries(
  Object.keys(table)
    .sort()
    .map((key) => [key, table[key]]),
);

await writeFile(
  OUT,
  `# Link annotations for the hover previews.\n` +
    `# Generated by \`npm run annotations\`; edit freely, reruns keep your text.\n\n` +
    dump(sorted, { lineWidth: 100, quotingType: '"' }),
);

console.log(
  `${Object.keys(sorted).length} annotations (${added} new, ${missed} without metadata)`,
);
