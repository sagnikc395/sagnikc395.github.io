<script lang="ts">
	import { page } from '$app/stores';
	import Seo from '$lib/components/Seo.svelte';

	import Projects from './Projects.svelte';

	const notes = import.meta.glob('../../projects/*.md', {
		eager: true
	}) as any;

	const images = import.meta.glob('../../projects/*.{png,jpg,svg}', {
		eager: true
	}) as any;

	function trimName(id: string) {
		return id.match(/\.\.\/notes\/(.*)\.md$/)?.[1];
	}

	$: notesByDate = Object.keys(notes).sort((a, b) => notes[b].date - notes[a].date);
</script>

<Seo
	title="Sagnik Chatterjee - Projects"
	description="my side projects"
/>

<section class="layout-md">
	<p class="text-sm md:text-lg mb-4">
		<em> an index of some of my open source projects</em>
	</p>
	<hr />
</section>

<div class="layout-md">
	{#each notesByDate as id (id)}
		<section class="py-10 border-b border-stone-800" id={trimName(id)}>
			<Projects data={notes[id]} {images} />
		</section>
	{/each}
</div>
