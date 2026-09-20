import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { dataToEsm } from "@rollup/pluginutils";
import pluginYaml from "@rollup/plugin-yaml";
import { load } from "js-yaml";
import { createHighlighter } from "shiki";
import { Marked } from "marked";
import { markedSmartypants } from "marked-smartypants";
import { readFileSync, existsSync } from "node:fs";
import { join as joinPath } from "node:path";

/** Flexoki's VS Code themes (kepano/flexoki), loaded into Shiki so code blocks
    use the same palette as the rest of the site. */
const flexokiTheme = (variant: "light" | "dark") =>
  JSON.parse(
    readFileSync(
      new URL(`./src/themes/flexoki-${variant}.json`, import.meta.url),
      "utf8",
    ),
  );

/** Strips Markdown syntax off a line, leaving readable plain text. */
function stripInline(line: string): string {
  return line
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/** Builds a short plain-text preview from a post body, for the blog list hover cards. */
function excerptOf(content: string, maxWords = 55): string {
  const words: string[] = [];
  let inCodeFence = false;

  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();

    if (line.startsWith("```")) {
      inCodeFence = !inCodeFence;
      continue;
    }
    if (inCodeFence) continue;

    // Skip headings, quotes, tables, rules, images.
    if (!line) continue;
    if (/^(#{1,6}\s|>|\||-{3,}|\*{3,}|!\[)/.test(line)) continue;
    // Skip whole-line italic asides ("_Course project for CS685…_").
    if (/^_.*$/.test(line)) continue;

    const text = stripInline(line.replace(/^([-*+]|\d+\.)\s+/, "")).replace(
      /^[_*]+|[_*]+$/g,
      "",
    );
    if (!text) continue;

    words.push(...text.split(" "));
    if (words.length >= maxWords) break;
  }

  if (words.length === 0) return "";
  const truncated = words.length > maxWords;
  return words.slice(0, maxWords).join(" ") + (truncated ? "…" : "");
}

/** Flattens a Markdown body to plain prose, for the ⌘K search index. */
function plainText(content: string): string {
  const parts: string[] = [];
  let inCodeFence = false;

  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();

    if (line.startsWith("```")) {
      inCodeFence = !inCodeFence;
      continue;
    }
    // Code is noise in a prose index; headings and list items are not.
    if (inCodeFence) continue;
    if (!line || /^(-{3,}|\*{3,}|\|[-\s|:]+\|)$/.test(line)) continue;

    const text = stripInline(
      line
        .replace(/^#{1,6}\s+/, "")
        .replace(/^>\s?/, "")
        .replace(/^([-*+]|\d+\.)\s+/, "")
        .replace(/\|/g, " "),
    );
    if (text) parts.push(text);
  }

  return parts.join(" ");
}

/** Reads intrinsic pixel dimensions straight from a PNG or JPEG header. */
function imageSize(file: string): { width: number; height: number } | null {
  let buf: Buffer;
  try {
    buf = readFileSync(file);
  } catch {
    return null;
  }

  // PNG: IHDR width/height are two big-endian uint32s at offset 16.
  if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }

  // JPEG: walk the marker segments looking for a start-of-frame.
  if (buf.length > 4 && buf.readUInt16BE(0) === 0xffd8) {
    let offset = 2;
    while (offset + 9 < buf.length) {
      if (buf[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const marker = buf[offset + 1];
      // SOF0-SOF15, skipping the non-frame markers in that range.
      if (
        marker >= 0xc0 &&
        marker <= 0xcf &&
        marker !== 0xc4 &&
        marker !== 0xc8 &&
        marker !== 0xcc
      ) {
        return {
          height: buf.readUInt16BE(offset + 5),
          width: buf.readUInt16BE(offset + 7),
        };
      }
      offset += 2 + buf.readUInt16BE(offset + 2);
    }
  }

  return null;
}

/**
 * Renders a Markdown image as a <picture> with a WebP source when a sibling
 * .webp exists, and always with explicit width/height so the page reserves
 * space before the bytes arrive (no layout shift).
 */
function renderImage(href: string, title: string | null, alt: string): string {
  const url = encodeURI(href);
  const titleAttr = title ? ` title="${title}"` : "";

  // Only local, absolute asset paths can be measured; leave remote URLs alone.
  if (!href.startsWith("/")) {
    return `<img src="${url}" alt="${alt}"${titleAttr} loading="lazy" decoding="async">`;
  }

  const file = joinPath("static", href);
  const size = imageSize(file);
  const dims = size ? ` width="${size.width}" height="${size.height}"` : "";

  const webp = href.replace(/\.(png|jpe?g)$/i, ".webp");
  const hasWebp = webp !== href && existsSync(joinPath("static", webp));

  const img = `<img src="${url}" alt="${alt}"${titleAttr}${dims} loading="lazy" decoding="async">`;
  if (!hasWebp) return img;

  return `<picture><source srcset="${encodeURI(webp)}" type="image/webp">${img}</picture>`;
}

/** Turns heading text into an anchor id: "Why SAEs?" -> "why-saes". */
function slugify(html: string): string {
  return stripInline(html)
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

/** A custom Markdown plugin for Vite, with TOML/YAML frontmatter support and Shiki highlighting. */
function markdown() {
  let highlighterPromise: ReturnType<typeof createHighlighter> | null = null;

  return {
    name: "markdown",

    async transform(src: string, id: string) {
      const [filePath, query = ""] = id.split("?", 2);

      if (/\.md$/.test(filePath)) {
        const params = new URLSearchParams(query);

        // Let Vite's built-in raw loader return markdown source for data files.
        if (params.has("raw")) return null;

        const metadataOnly = params.has("meta");
        let frontmatter = {};
        let content = src;

        if (src.startsWith("---")) {
          const end = src.indexOf("---", 3);
          if (end === -1) {
            throw new Error(`Unclosed frontmatter in ${id}`);
          }
          frontmatter = load(src.substring(3, end).trim()) ?? {};
          content = src.substring(end + 3).trim();
        }

        if (metadataOnly) {
          return {
            code: dataToEsm({ excerpt: excerptOf(content), ...frontmatter }),
            map: null,
          };
        }

        // The search palette wants the whole body as prose, and nothing else;
        // it loads these chunks only once someone opens it.
        if (params.has("search")) {
          return { code: dataToEsm({ text: plainText(content) }), map: null };
        }

        if (!highlighterPromise) {
          highlighterPromise = createHighlighter({
            themes: [flexokiTheme("light"), flexokiTheme("dark")],
            langs: [
              "javascript",
              "typescript",
              "css",
              "html",
              "bash",
              "json",
              "markdown",
              "svelte",
              "python",
              "yaml",
              "diff",
              "go",
            ],
          });
        }
        const highlighter = await highlighterPromise;

        const marked = new Marked(markedSmartypants(), {
          gfm: true,
          renderer: {
            code({ text, lang }) {
              return highlighter.codeToHtml(text, {
                lang: lang || "text",
                themes: {
                  light: "flexoki-light",
                  dark: "flexoki-dark",
                },
              });
            },
            link({ href, title, tokens }) {
              const url = encodeURI(href || "#");
              const titleStr = title ? ` title="${title}"` : "";
              const text = this.parser.parseInline(tokens);
              // Only off-site links are "external"; the link previews read this
              // to tell a paper apart from another page here.
              const rel = /^https?:\/\//i.test(url) ? ' rel="external"' : "";
              return `<a${rel} href="${url}" class="link"${titleStr}>${text}</a>`;
            },
            image({ href, title, text }) {
              return renderImage(href, title, text);
            },
            heading({ tokens, depth }) {
              const text = this.parser.parseInline(tokens);
              // The page renders the frontmatter title, so a body <h1> is a duplicate.
              if (depth === 1) return "";
              // The id makes a section linkable, and gives "#section" links
              // something for the preview card to quote.
              return `<h${depth} id="${slugify(text)}">${text}</h${depth}>`;
            },
          },
        });

        const html = marked.parse(content);

        return {
          code: dataToEsm({ ...frontmatter, content: html }),
          map: null,
        };
      }
    },
  };
}

export default defineConfig({
  publicDir: "static",
  resolve: {
    alias: {
      $lib: "/src/lib",
      $posts: "/src/posts",
      $projects: "/src/projects",
    },
  },
  // Svelte-level perf: modern target, no console, split vendor for long-term caching
  build: {
    target: "esnext",
    cssMinify: true,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 500,
    assetsInlineLimit: 4096,
    modulePreload: { polyfill: false },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
        },
      },
    },
  },
  esbuild: { legalComments: "none", drop: ["console", "debugger"] },
  ssr: {
    // Bundle everything into the server build; it is thrown away after prerendering.
    noExternal: true,
  },
  optimizeDeps: { include: ["react", "react-dom", "react-router-dom"] },
  plugins: [react(), pluginYaml(), markdown()],
});
