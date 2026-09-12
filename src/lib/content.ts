/**
 * Markdown content is code-split: each post and project is its own chunk, loaded
 * on demand. Prerendering and hydration both need it *synchronously* though, so
 * resolved modules land in a module-level cache that `peekContent` reads without
 * awaiting. Call `preloadRoute` before rendering (server) or hydrating (client)
 * and the first render of a content page matches on both sides.
 */

export type Kind = "post" | "project";

const loaders: Record<Kind, Record<string, () => Promise<unknown>>> = {
  post: import.meta.glob("../posts/*.md"),
  project: import.meta.glob("../projects/*.md"),
};

const dirs: Record<Kind, string> = {
  post: "../posts/",
  project: "../projects/",
};

// undefined = not resolved yet, null = no such slug.
const cache = new Map<string, unknown>();

const keyOf = (kind: Kind, slug: string) => `${kind}:${slug}`;

export function slugsOf(kind: Kind): string[] {
  const dir = dirs[kind];
  return Object.keys(loaders[kind])
    .map((file) => file.slice(dir.length).replace(/\.md$/, ""))
    .filter((slug) => !slug.startsWith("."));
}

/** Synchronous read. `undefined` means "not loaded yet", `null` means "not found". */
export function peekContent<T>(kind: Kind, slug: string): T | null | undefined {
  const key = keyOf(kind, slug);
  return cache.has(key) ? (cache.get(key) as T | null) : undefined;
}

export async function loadContent<T>(
  kind: Kind,
  slug: string,
): Promise<T | null> {
  const key = keyOf(kind, slug);
  if (cache.has(key)) return cache.get(key) as T | null;

  const loader = loaders[kind][`${dirs[kind]}${slug}.md`];
  if (!loader) {
    cache.set(key, null);
    return null;
  }

  const mod = (await loader()) as { default?: T } & T;
  const data = (mod.default ?? mod) as T;
  cache.set(key, data);
  return data;
}

/** Maps a pathname to the content it needs, if any. */
export function routeContent(
  pathname: string,
): { kind: Kind; slug: string } | null {
  const post = pathname.match(/^\/blog\/([^/]+)\/?$/);
  if (post) return { kind: "post", slug: decodeURIComponent(post[1]) };

  const project = pathname.match(/^\/project\/([^/]+)\/?$/);
  if (project) return { kind: "project", slug: decodeURIComponent(project[1]) };

  return null;
}

export async function preloadRoute(pathname: string): Promise<void> {
  const target = routeContent(pathname);
  if (target) await loadContent(target.kind, target.slug);
}
