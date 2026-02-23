import { mdsvex, escapeSvelte } from 'mdsvex';
import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { getSingletonHighlighter } from 'shiki';

const highlighter = await getSingletonHighlighter({
	themes: ['vitesse-dark'],
	langs: ['javascript', 'typescript', 'svelte', 'css', 'html', 'bash', 'json', 'python', 'markdown']
});

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: [
		vitePreprocess(),
		mdsvex({
			extensions: ['.svx', '.md'],
			highlight: {
				highlighter: async (code, lang) => {
					if (lang && lang.includes('//')) return code;
					const html = escapeSvelte(highlighter.codeToHtml(code, { lang, theme: 'vitesse-dark' }));
					return `{@html \`${html}\`}`;
				}
			}
		})
	],
	kit: {
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: null
		}),
		paths: {
			base: ''
		}
	},
	extensions: ['.svelte', '.svx', '.md']
};

export default config;
