<script lang="ts">
	export let source: string;
</script>

<div class="md-output">
	{@html source}
</div>

<style lang="postcss">
	@reference "tailwindcss";
	
	.md-output :global(p) {
		@apply mb-4 leading-7;
	}

	.md-output :global(strong) {
		@apply font-semibold;
	}

	.md-output :global(h2) {
		@apply text-xl font-semibold mt-8 mb-4 text-stone-100;
	}

	.md-output :global(h3) {
		@apply text-lg font-semibold mt-6 mb-3 text-stone-100;
	}

	.md-output :global(ul) {
		@apply list-disc list-outside ml-5 mb-4;
	}
	
	.md-output :global(ol) {
		@apply list-decimal list-outside ml-5 mb-4;
	}

	.md-output :global(li) {
		@apply mb-1;
	}
	
	.md-output :global(blockquote) {
		@apply border-l-4 border-stone-700 pl-4 italic text-stone-400 mb-4;
	}

	/* Inline code */
	.md-output :global(:not(pre) > code) {
		@apply font-mono text-[0.9em] bg-stone-800 px-1.5 py-0.5 rounded text-stone-200;
	}

	/* Code blocks (Shiki) */
	.md-output :global(pre.shiki) {
		@apply p-4 rounded-lg overflow-x-auto mb-6 text-sm leading-relaxed border border-stone-800;
	}
	
	.md-output :global(pre.shiki code) {
		@apply bg-transparent p-0 text-inherit;
	}
</style>