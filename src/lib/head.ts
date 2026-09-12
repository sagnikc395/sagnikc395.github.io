/**
 * During prerendering there is no document to mutate, so <Seo> records the page
 * title and description here and the prerender script reads them back out after
 * rendering. Single-threaded build step, so a module-level sink is safe.
 */
export const head = { title: "", description: "" };

export function setHead(title: string, description: string) {
  head.title = title;
  head.description = description;
}
