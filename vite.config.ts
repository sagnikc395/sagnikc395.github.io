import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { dataToEsm } from "@rollup/pluginutils";
import pluginYaml from "@rollup/plugin-yaml";
import { load } from "js-yaml";
import { createHighlighter } from "shiki";
import { Marked } from "marked";
import { markedSmartypants } from "marked-smartypants";
import fs from "node:fs/promises";
import path from "node:path";

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

/** A custom Markdown plugin for Vite, with TOML/YAML frontmatter support and Shiki highlighting. */
function markdown() {
  let highlighterPromise: ReturnType<typeof createHighlighter> | null = null;

  return {
    name: "markdown",

    async transform(src: string, id: string) {
      const [filePath, query = ""] = id.split("?", 2);

      if (/\.md$/.test(filePath)) {
        // Let Vite's built-in raw loader return markdown source for data files.
        if (new URLSearchParams(query).has("raw")) return null;

        const metadataOnly = new URLSearchParams(query).has("meta");
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

        if (!highlighterPromise) {
          highlighterPromise = createHighlighter({
            themes: ["vitesse-light", "vitesse-dark"],
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
                  light: "vitesse-light",
                  dark: "vitesse-dark",
                },
              });
            },
            link({ href, title, tokens }) {
              const url = encodeURI(href || "#");
              const titleStr = title ? ` title="${title}"` : "";
              const text = this.parser.parseInline(tokens);
              return `<a rel="external" href="${url}" class="link"${titleStr}>${text}</a>`;
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

function prerender(): Plugin {
  return {
    name: "prerender",
    async closeBundle() {
      const outDir = path.resolve("dist");
      let template: string;
      try {
        template = await fs.readFile(path.join(outDir, "index.html"), "utf8");
      } catch {
        return;
      }

      const escapeHtml = (s: string) =>
        s
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll('"', "&quot;");

      const formatDate = (d: string) => {
        try {
          return new Intl.DateTimeFormat("en-GB", {
            day: "2-digit",
            month: "long",
            year: "numeric",
            timeZone: "UTC",
          }).format(new Date(d));
        } catch {
          return d;
        }
      };

      let highlighter: Awaited<ReturnType<typeof createHighlighter>> | null =
        null;
      const getHighlighter = async () => {
        if (!highlighter) {
          highlighter = await createHighlighter({
            themes: ["vitesse-light", "vitesse-dark"],
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
        return highlighter;
      };

      const renderMarkdown = async (md: string): Promise<string> => {
        const hl = await getHighlighter();
        const marked = new Marked(markedSmartypants(), {
          gfm: true,
          renderer: {
            code({ text, lang }) {
              return hl.codeToHtml(text, {
                lang: lang || "text",
                themes: { light: "vitesse-light", dark: "vitesse-dark" },
              });
            },
            link({ href, title, tokens }) {
              const url = encodeURI(href || "#");
              const titleStr = title ? ` title="${title}"` : "";
              const text = this.parser.parseInline(tokens);
              return `<a rel="external" href="${url}" class="link"${titleStr}>${text}</a>`;
            },
          },
        });
        return (await marked.parse(md)) as string;
      };

      const writeRoute = async (
        route: string,
        opts?: { title?: string; html?: string },
      ) => {
        const dir = path.join(outDir, route);
        await fs.mkdir(dir, { recursive: true });
        let html = template;
        if (opts?.title) {
          html = html.replace(
            /<title>.*?<\/title>/,
            `<title>${escapeHtml(opts.title)}</title>`,
          );
        }
        if (opts?.html) {
          html = html.replace(
            '<div id="root"></div>',
            `<div id="root">${opts.html}</div>`,
          );
        }
        await fs.writeFile(path.join(dir, "index.html"), html);
      };

      // static routes (SPA fallback) – copy template so GitHub Pages returns 200 instead of 404
      const staticRoutes = ["blog", "projects", "reading-list"];
      for (const r of staticRoutes) {
        await writeRoute(r);
      }

      // blog posts – prerender with real content so wget/curl gets HTML without JS
      try {
        const posts = await fs.readdir("src/posts");
        for (const file of posts) {
          if (!file.endsWith(".md")) continue;
          if (file.startsWith(".")) continue;
          const slug = file.replace(/\.md$/, "");
          const raw = await fs.readFile(path.join("src/posts", file), "utf8");
          let frontmatter: Record<string, unknown> = {};
          let content = raw;
          if (raw.startsWith("---")) {
            const end = raw.indexOf("---", 3);
            if (end !== -1) {
              frontmatter =
                (load(raw.substring(3, end).trim()) as Record<
                  string,
                  unknown
                >) ?? {};
              content = raw.substring(end + 3).trim();
            }
          }
          if (frontmatter["draft"]) continue;
          const title = (frontmatter["title"] as string) ?? slug;
          const date = (frontmatter["date"] as string) ?? "";
          const htmlContent = await renderMarkdown(content);
          const refs = frontmatter["references"] as
            | { title: string; url: string; author?: string }[]
            | undefined;
          const refsHtml = refs?.length
            ? `<section class="mt-10"><h2 class="text-xl font-semibold">References</h2><ul class="mt-4 space-y-2">${refs
                .map(
                  (r) =>
                    `<li><a class="link" href="${escapeHtml(r.url)}" rel="external">${escapeHtml(r.title)}</a>${r.author ? ` — ${escapeHtml(r.author)}` : ""}</li>`,
                )
                .join("")}</ul></section>`
            : "";
          const prerendered = `<article class="layout-md py-10"><header class="mb-8"><h1 class="text-3xl font-bold mb-2 text-stone-100">${escapeHtml(title)}</h1>${date ? `<div class="text-stone-400">${escapeHtml(formatDate(date))}</div>` : ""}</header><div class="prose prose-stone prose-invert max-w-none">${htmlContent}</div>${refsHtml}</article>`;
          await writeRoute(path.join("blog", slug), {
            title: `${title} — Sagnik Chatterjee`,
            html: prerendered,
          });
        }
      } catch {
        // ignore if src/posts missing
      }

      // projects – same treatment
      try {
        const projects = await fs.readdir("src/projects");
        for (const file of projects) {
          if (!file.endsWith(".md")) continue;
          const slug = file.replace(/\.md$/, "");
          const raw = await fs.readFile(
            path.join("src/projects", file),
            "utf8",
          );
          let frontmatter: Record<string, unknown> = {};
          let content = raw;
          if (raw.startsWith("---")) {
            const end = raw.indexOf("---", 3);
            if (end !== -1) {
              frontmatter =
                (load(raw.substring(3, end).trim()) as Record<
                  string,
                  unknown
                >) ?? {};
              content = raw.substring(end + 3).trim();
            }
          }
          const title = (frontmatter["title"] as string) ?? slug;
          const htmlContent = await renderMarkdown(content);
          const prerendered = `<article class="layout-md py-10"><h1 class="text-3xl font-bold mb-2 text-stone-100">${escapeHtml(title)}</h1><div class="prose prose-stone prose-invert max-w-none mt-8">${htmlContent}</div></article>`;
          await writeRoute(path.join("project", slug), {
            title: `${title} — Sagnik Chatterjee`,
            html: prerendered,
          });
        }
      } catch {
        // ignore
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
  optimizeDeps: { include: ["react", "react-dom", "react-router-dom"] },
  plugins: [tailwindcss(), react(), pluginYaml(), markdown(), prerender()],
});
