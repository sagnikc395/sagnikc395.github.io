<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';
	import Markdown from '$lib/components/Markdown.svelte';
	import { formatTime } from '$lib/utils';
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<Seo
	title={data.title}
	description={`Blog post: ${data.title}`}
/>

<article class="layout-md py-10">
	<header class="mb-8">
		<h1 class="text-3xl font-bold mb-2">{data.title}</h1>
		<div class="text-stone-400">
			{formatTime('%d %B %Y', data.date)}
		</div>
	</header>

	{#if data.image}
		<img
			src={data.image}
			alt={data.title}
			class="w-full rounded-lg mb-8 shadow-md"
		/>
	{/if}

	<div class="prose prose-stone prose-invert prose-headings:font-semibold prose-headings:text-stone-100 prose-p:text-stone-300 prose-a:text-blue-600 hover:prose-a:text-blue-800 max-w-none">
		<Markdown source={data.content} />
	</div>
</article>
