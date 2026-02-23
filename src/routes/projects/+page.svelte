<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';
	import { formatTime } from '$lib/utils';

	const projects = import.meta.glob('../../projects/*.md', {
		eager: true
	}) as any;

	const images = import.meta.glob('../../projects/*.{png,jpg,svg}', {
		eager: true
	}) as any;

	function getSlug(id: string) {
		return id.match(/\.\.\/\.\.\/projects\/(.*)\.md$/)?.[1];
	}

	function isURL(path: string): boolean {
		try {
			new URL(path);
			return true;
		} catch {
			return false;
		}
	}

	function getImageUrl(path: string) {
		if (!path) return null;
		if (isURL(path)) return path;
		return images[`../../projects/${path}`]?.default;
	}

	$: sortedProjectIds = Object.keys(projects).sort((a, b) => {
		const dateA = new Date(projects[a].date).getTime();
		const dateB = new Date(projects[b].date).getTime();
		return dateB - dateA;
	});
</script>

<Seo title="Sagnik Chatterjee - Projects" description="my side projects" />

<section class="layout-md">
	<p class="text-sm md:text-lg mb-4">
		<em> an index of some of my open source projects</em>
	</p>

	<hr class="border-stone-800" />
</section>

<div class="layout-md mt-10">
	<div class="grid gap-8">
		{#each sortedProjectIds as id (id)}
			{@const project = projects[id]}
			{@const slug = getSlug(id)}
			<a
				href="/project/{slug}"
				class="group block p-6 border border-stone-800 rounded-xl hover:bg-stone-900 transition-all duration-200"
			>
				<div class="flex flex-col md:flex-row gap-6">
					{#if project.image}
						<div class="w-full md:w-48 h-32 flex-shrink-0">
							<img
								src={getImageUrl(project.image)}
								alt={project.title}
								class="w-full h-full object-cover rounded-lg grayscale group-hover:grayscale-0 transition-all duration-500"
							/>
						</div>
					{/if}
					<div class="flex-grow">
						<div class="flex justify-between items-start mb-2">
							<h2 class="text-xl font-semibold text-stone-100 group-hover:text-blue-400 transition-colors">
								{project.title}
							</h2>
							{#if project.date}
								<span class="text-stone-500 text-sm">
									{formatTime('%Y', project.date)}
								</span>
							{/if}
						</div>
						<p class="text-stone-400 line-clamp-2">
							{project.lead || 'Click to view project details...'}
						</p>
						<div class="mt-4 flex flex-wrap gap-2">
							{#if project.topics}
								{#each project.topics as topic}
									<span class="px-2 py-1 text-xs bg-stone-800 text-stone-300 rounded">
										{topic}
									</span>
								{/each}
							{/if}
						</div>
					</div>
				</div>
			</a>
		{/each}
	</div>
</div>
