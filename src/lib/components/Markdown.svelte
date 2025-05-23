<script lang="ts">
	import { marked, type Token, type Renderer } from 'marked';
	import { markedSmartypants } from 'marked-smartypants';

	export let source: string;
	let html: string = '';

	const renderer: Partial<Renderer> = {
		link(this: Renderer, token: Token): string {
			if (token.type !== 'link') return '';
			const href = encodeURI(token.href || '#');
			const title = token.title ? ` title="${token.title}"` : '';
			return `<a rel="external" href="${href}" class="link"${title}>${token.text}</a>`;
		}
	};

	marked.use({ renderer });
	marked.use(markedSmartypants());

	$: html = marked.parse(source, {
		gfm: true
	}) as string;
</script>

<div class="md-output">
	{@html html}
</div>

<style lang="postcss">
	.md-output :global(p) {
		@apply mb-4;
	}

	.md-output :global(strong) {
		@apply font-semibold;
	}

	.md-output :global(code) {
		@apply text-[95%];
	}
</style>
