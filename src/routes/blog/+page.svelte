<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';
	import { formatTime } from '$lib/utils';

	const posts = import.meta.glob('../../posts/*.md', {
		eager: true
	}) as Record<string, any>;

	$: sortedPosts = Object.entries(posts)
		.map(([path, post]) => {
			const slug = path.split('/').pop()?.replace('.md', '');
			return {
				slug,
				...post
			};
		})
		.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
</script>

<Seo
	title="Sagnik Chatterjee - Blog"
	description="My thoughts and writings"
/>

<section class="layout-md">
	<h1 class="text-2xl font-bold mb-6">Blog</h1>
	<p class="text-sm md:text-lg mb-4">
		<em>writings and thoughts</em>
	</p>
	<hr class="mb-8" />

	<div class="flex flex-col gap-8">
		{#each sortedPosts as post}
			<article class="flex flex-col gap-2">
				<a href="/blog/{post.slug}" class="text-xl font-semibold hover:text-blue-600 transition-colors">
					{post.title}
				</a>
				<span class="text-stone-400 text-sm">
					{formatTime('%d %B %Y', post.date)}
				</span>
				{#if post.description}
					<p class="text-stone-300">{post.description}</p>
				{/if}
			</article>
		{/each}
	</div>
</section>
