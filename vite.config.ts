import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { dataToEsm } from "@rollup/pluginutils";
import pluginYaml from "@rollup/plugin-yaml";
import { load } from "js-yaml";
import { createHighlighter } from "shiki";
import { Marked } from "marked";
import { markedSmartypants } from "marked-smartypants";

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

export default defineConfig({
  publicDir: "static",
  resolve: {
    alias: {
      $lib: "/src/lib",
      $posts: "/src/posts",
      $projects: "/src/projects",
    },
  },
  plugins: [tailwindcss(), react(), pluginYaml(), markdown()],
});
