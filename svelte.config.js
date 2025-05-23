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
	paths: {
		base: ''
	},
	extensions: ['.svelte', '.svx']
};

export default config;
