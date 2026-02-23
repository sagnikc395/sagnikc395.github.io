<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';
	import ProjectDetail from '$lib/components/ProjectDetail.svelte';
	import type { PageData } from './$types';

	export let data: PageData;

	const images = import.meta.glob('../../../projects/*.{png,jpg,svg}', {
		eager: true
	}) as any;
</script>

<Seo title="Sagnik Chatterjee - {data.title}" description={data.title} />

<section class="layout-md py-10">
	<a href="/projects" class="text-stone-400 hover:text-stone-100 mb-8 inline-block">
		&larr; Back to projects
	</a>
	<ProjectDetail {data} {images} imagePrefix="../../../projects/" />
</section>
