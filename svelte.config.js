import { mdsvex } from 'mdsvex';
import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';


const config = {
	preprocess: [vitePreprocess(), mdsvex()],
	kit: {
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: null
		})
	},
	highlight: {
		highlighter: async (code, lang) => {
			const highlighter = await getHighlighter({
				theme: 'vitesse-dark' // Customize your theme here
			});
			const html = highlighter.codeToHtml(code, { lang });
			return `{@html \`${html}\`}`;
		}
	},
	paths: {
		base: ''
	},
	extensions: ['.svelte', '.svx']
};

export default config;
