import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { dataToEsm } from '@rollup/pluginutils';
import pluginYaml from '@rollup/plugin-yaml';
import { load } from 'js-yaml';
import { createHighlighter } from 'shiki';
import { Marked } from 'marked';
import { markedSmartypants } from 'marked-smartypants';

/** A custom Markdown plugin for Vite, with TOML/YAML frontmatter support and Shiki highlighting. */
function markdown() {
	let highlighter: Awaited<ReturnType<typeof createHighlighter>> | null = null;

	return {
		name: 'markdown',

		async transform(src: string, id: string) {
			if (/\.md$/.test(id)) {
				let frontmatter = {};
				let content = src;
				if (src.startsWith('---')) {
					const end = src.indexOf('---', 3);
					if (end === -1) {
						throw new Error(`Unclosed frontmatter in ${id}`);
					}
					frontmatter = load(src.substring(3, end).trim()) ?? {};
					content = src.substring(end + 3).trim();
				}

				if (!highlighter) {
					highlighter = await createHighlighter({
						themes: ['vitesse-light', 'vitesse-dark'],
						langs: [
							'javascript',
							'typescript',
							'css',
							'html',
							'bash',
							'json',
							'markdown',
							'svelte',
							'python',
							'yaml',
							'diff'
						]
					});
				}

				const marked = new Marked(markedSmartypants(), {
					gfm: true,
					renderer: {
						code({ text, lang }) {
							return highlighter!.codeToHtml(text, {
								lang: lang || 'text',
								themes: {
									light: 'vitesse-light',
									dark: 'vitesse-dark'
								}
							});
						},
						link({ href, title, tokens }) {
							const url = encodeURI(href || '#');
							const titleStr = title ? ` title="${title}"` : '';
							const text = this.parser.parseInline(tokens);
							return `<a rel="external" href="${url}" class="link"${titleStr}>${text}</a>`;
						}
					}
				});

				const html = marked.parse(content);

				return {
					code: dataToEsm({ ...frontmatter, content: html }),
					map: null
				};
			}
		}
	};
}

export default defineConfig({
	plugins: [tailwindcss(), sveltekit(), pluginYaml(), markdown()]
});