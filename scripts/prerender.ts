/**
 * Renders every route to a static HTML file so the browser gets real content
 * before any JavaScript runs. Uses the SSR build in dist-ssr/ and the client
 * build's index.html as the shell.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const outDir = "dist";
const site = "https://sagnikc395.github.io";
const ssrEntry = path.resolve("dist-ssr/entry-server.js");

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const { render, routes } = await import(pathToFileURL(ssrEntry).href);

let template = await fs.readFile(path.join(outDir, "index.html"), "utf8");

// Inline the stylesheet. It is a couple of KB, and a separate file would be a
// render-blocking round trip on every page.
const cssLink = template.match(
  /<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/,
);
if (cssLink) {
  const css = await fs.readFile(path.join(outDir, cssLink[1]), "utf8");
  template = template.replace(cssLink[0], `<style>${css}</style>`);
  await fs.rm(path.join(outDir, cssLink[1]), { force: true });
}
const urls: string[] = await routes();

for (const url of urls) {
  const { html, title, description } = await render(url);

  let page = template.replace(
    '<div id="root"></div>',
    `<div id="root">${html}</div>`,
  );

  if (title) {
    page = page.replace(
      /<title>[\s\S]*?<\/title>/,
      `<title>${escapeHtml(title)}</title>`,
    );
  }
  if (description) {
    page = page.replace(
      /<meta\s+name="description"[\s\S]*?\/>/,
      `<meta name="description" content="${escapeHtml(description)}" />`,
    );
  }

  page = page.replace(
    "</head>",
    `  <link rel="canonical" href="${site}${url === "/" ? "/" : `${url}/`}" />\n  </head>`,
  );

  const dir = url === "/" ? outDir : path.join(outDir, url);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, "index.html"), page);
}

const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...urls
    .filter((url) => url !== "/404")
    .map(
      (url) =>
        `  <url><loc>${site}${url === "/" ? "/" : `${url}/`}</loc></url>`,
    ),
  "</urlset>",
].join("\n");
await fs.writeFile(path.join(outDir, "sitemap.xml"), sitemap);

// GitHub Pages serves 404.html for unknown paths.
await fs.copyFile(
  path.join(outDir, "404", "index.html"),
  path.join(outDir, "404.html"),
);

await fs.rm("dist-ssr", { recursive: true, force: true });

console.log(`prerendered ${urls.length} routes`);
