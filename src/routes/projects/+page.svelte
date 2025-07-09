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
	title="Sagnik Chatterjee - Writings"
	description="small writings and things that I wanna remember"
/>

<section class="layout-md">
	<p class="text-sm md:text-lg mb-4">
		<em> an index of some of my projects and links </em>
	</p>
	<hr />
</section>

<div class="items-center flex flex-col text-neutral-900">
	{#each notesByDate as id (id)}
		<section class="py-10" id={trimName(id)}>
			<div class="mx-auto max-w-[1152px] px-4 sm:px-6">
				<Projects data={notes[id]} {images} />
			</div>
		</section>
		<hr />
	{/each}
</div>
