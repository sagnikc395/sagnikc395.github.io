/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	darkMode: 'selector',
	theme: {
		extend: {
			fontFamily: {
				// Tip: Added system fallbacks for better performance
				sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
				serif: ['Newsreader', 'ui-serif', 'Georgia', 'serif'],
				mono: ['"Input Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace']
			}
		}
	},
	plugins: [
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		require('@tailwindcss/typography'),
	]
};