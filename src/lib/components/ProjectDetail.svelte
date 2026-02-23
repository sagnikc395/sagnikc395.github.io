<script lang="ts">
	import Markdown from '$lib/components/Markdown.svelte';
	import type { Project } from '$lib/types';
	import { formatTime } from '$lib/utils';

	export let data: Project;
	export let images: Record<string, { default: string }>;
	export let imagePrefix: string = '../../projects/';

	function isURL(path: string): boolean {
		try {
			new URL(path);
			return true;
		} catch {
			return false;
		}
	}

	function getImageUrl(path: string) {
		if (isURL(path)) return path;
		return images[`${imagePrefix}${path}`]?.default;
	}
</script>

<!-- project header -->
<h3 class="text-stone-100 text-xl md:text-2xl font-semibold mb-4 flex flex-wrap items-center">
	{#if data.title}
		<span class="mr-2">{data.title}</span>
	{/if}
	{#if data.date}
		<small class="text-stone-400 text-base font-normal">
			{formatTime('%d %B %Y', data.date)}
		</small>
	{/if}
</h3>

<!-- project body -->
<div class="grid md:grid-cols-3 gap-6 items-start">
	<!-- main image -->
	{#if data.image}
		<div class="md:col-span-1">
			<a rel="external" href={getImageUrl(data.image)}>
				<img
					src={getImageUrl(data.image)}
					alt="{data.title} preview image"
					class="rounded-lg shadow-sm max-h-64 object-cover w-full"
				/>
			</a>
		</div>
	{/if}

	<!-- description -->
	<div
		class="md:col-span-2 prose prose-stone prose-invert prose-headings:font-semibold prose-a:text-blue-600 hover:prose-a:text-blue-800 max-w-none"
	>
		<Markdown source={data.content} />
	</div>
</div>

<!-- subimages -->
{#if data.subimages}
	<div class="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
		{#each data.subimages as image}
			<a rel="external" href={getImageUrl(image)}>
				<img
					src={getImageUrl(image)}
					alt="{data.title} subimage"
					class="rounded-lg shadow-sm object-cover w-full max-h-48"
				/>
			</a>
		{/each}
	</div>
{/if}

<style lang="postcss">
	@reference "tailwindcss";

	h3 {
		@apply break-words;
	}
</style>
