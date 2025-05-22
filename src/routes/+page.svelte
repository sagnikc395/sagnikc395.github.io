<div class="layout-md text-center">
	<h1 class="text-4xl sm:text-5xl font-bold tracking-tight font-serif mb-6 text-neutral-100">
		Welcome to SvelteKit
	</h1>
	<p class="text-lg sm:text-xl font-sans text-neutral-300">
		Visit <a class="link font-mono" href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a> to read
		the documentation
	</p>
</div>

<style lang="postcss">
	@reference "tailwindcss";

	:global(html) {
		@apply motion-safe:scroll-smooth;
		background-color: theme(--color-zinc-900);
		font-family: theme(fontFamily.sans);
	}

	:global(body) {
		@apply py-12 sm:py-24 md:py-32 text-neutral-700;
	}

	:global(hr) {
		@apply border-neutral-200;
	}

	:global(.link) {
		@apply underline underline-offset-[3px] decoration-neutral-400 dark:decoration-neutral-500;
		@apply hover:text-white hover:decoration-white transition-colors;
		@apply dark:hover:text-white dark:hover:decoration-white;
	}

	:global(.layout-md) {
		@apply max-w-screen-md mx-auto px-4 sm:px-6;
	}

	:global(.heading2) {
		@apply text-black text-xl font-semibold mb-4;
	}

	:global(::selection) {
		@apply bg-neutral-200 dark:bg-neutral-600;
	}

	:global(.dark) {
		color-scheme: dark;
	}
</style>
