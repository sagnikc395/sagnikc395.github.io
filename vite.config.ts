import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { dataToEsm } from '@rollup/pluginutils';
import pluginYaml from '@rollup/plugin-yaml';
import { load } from 'js-yaml';

/** A custom Markdown plugin for Vite, with TOML frontmatter support. */
function markdown() {
	return {
		name: 'markdown',

		transform(src: string, id: string) {
			if (/\.md$/.test(id)) {
				let frontmatter = {};
				let content = src;
				if (src.startsWith('---')) {
					const end = src.indexOf('---', 3);
					if (end === -1) {
						throw new Error(`Unclosed TOML frontmatter in ${id}`);
					}
					frontmatter = load(src.substring(3, end).trim()) ?? {};
					content = src.substring(end + 3).trim();
				}
				return {
					code: dataToEsm({ ...frontmatter, content }),
					map: null
				};
			}
		}
	};
}

export default defineConfig({
	plugins: [tailwindcss(), sveltekit(), pluginYaml(), markdown()]
});
