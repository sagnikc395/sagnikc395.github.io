<script lang="ts">
	import Markdown from '$lib/components/Markdown.svelte';
	import type { Post } from '$lib/types';
	import { formatTime } from '$lib/utils';

	export let data: Post;
	// svelte-ignore export_let_unused
	export let images: Record<string, { default: string }>;

	function isURL(path: string): boolean {
		try {
			new URL(path);
			return true;
		} catch {
			return false;
		}
	}
</script>

<!-- title -->
<h3 class="text-black text-lg md:text-xl font-semibold mb-2">
	{#if data.title}
		<span class="mr-1">{data.title}</span>
	{/if}
	{#if data.date}
		<small class="whitespace-nowrap text-neutral-500 text-base font-normal">
			{formatTime('%d %B %Y', data.date)}
		</small>
	{/if}
</h3>

<!-- description and images -->
<div class="">
	<!-- image -->
	{#if data.image}
		<div class="col-span-3 md:col-span-1">
			<a rel="external" href={images[`../../writings/${data.image}`]?.default}>
				<img
					src={isURL(data.image) ? data.image : images[`../../writings/${data.image}`]?.default}
					alt="{data.title} preview image"
					class:url-image={isURL(data.image)}
				/></a
			>
		</div>
	{/if}

	<!-- sub images -->
	{#if data.subimages}
		<div class="grid grid-cols-3 gap-4 mb-10">
			{#each data.subimages as image}
				<div class="col-span-full md:col-span-1">
					<a rel="external" href={images[`../../writings/${image}`]?.default}>
						<img
							src={isURL(image) ? image : images[`../../writings/${data.image}`]?.default}
							alt="{data.title} subimage"
						/></a
					>
				</div>
			{/each}
		</div>
	{/if}

	<!-- description -->
	<div class="col-span-3 md:col-span-2">
		<Markdown source={data.content} />
	</div>
</div>

<style lang="postcss">
	@reference "tailwindcss";
	.url-image {
		margin: 1rem auto;
	}
</style>
