<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';
	import WritingList from './BlogList.svelte';
	import blog from './blog.yaml';
</script>

<Seo
	title="Sagnik Chatterjee – Blog"
	description="Past writing: academic papers, presentations, notes, tutorials, and technical blog posts."
/>

<section class="layout-md py-12">
	<h2 class="heading2">Technology</h2>
	<WritingList data={blog.technology} />
</section>

<section class="layout-md py-12">
	<h2 class="heading2">Notes and Tutorials</h2>
	<WritingList data={blog.notes} />
</section>

<section class="layout-md py-12">
	<h2 class="heading2">Academic Writing</h2>
	<WritingList data={blog.papers} />
</section>
