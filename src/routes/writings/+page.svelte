<script lang="ts">
	import { page } from '$app/stores';
	import Seo from '$lib/components/Seo.svelte';

	import Writings from './Writings.svelte';

	const notes = import.meta.glob('../../writings/*.md', {
		eager: true
	}) as any;

	const images = import.meta.glob('../../writings/*.{png,jpg,svg}', {
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
		<em> ideas that I think in a jiffy and for the vibes </em>
	</p>
	<hr />
</section>

<div class="items-center flex flex-col text-neutral-900">
	{#each notesByDate as id (id)}
		<section class="py-10" id={trimName(id)}>
			<div class="mx-auto max-w-[1152px] px-4 sm:px-6">
				<Writings data={notes[id]} {images} />
			</div>
		</section>
		<hr />
	{/each}
</div>
