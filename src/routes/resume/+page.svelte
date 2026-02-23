<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';
	import { Download } from 'lucide-svelte';
	import Workplace from './Workplace.svelte';
</script>

<Seo
	title="Sagnik Chatterjee – Resume"
	description="Graduate CS student exploring NLP, program synthesis, and biomedical applications"
/>

<section class="layout-md my-6">
	<h3 class="text-lg font-semibold flex items-center gap-3">
		<span>Download a PDF version of my resume</span>
		<a
			href="/assets/pdf/SagnikChatterjee-Resume.pdf"
			target="_blank"
			rel="noreferrer"
			class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-blue-600 text-blue-600 hover:bg-blue-50 transition"
		>
			<Download class="w-5 h-5" />
			<span>PDF</span>
		</a>
	</h3>
</section>

<section class="layout-md py-12 space-y-10">
	<!-- Education -->
	<div>
		<h2 class="heading2 mb-4">Education</h2>
		<div class="space-y-4">
			<div>
				<div class="flex justify-between items-end">
					<h3 class="text-lg font-semibold">University of Massachusetts, Amherst</h3>
					<p class="text-stone-400 text-sm">2025 — 2027</p>
				</div>
				<p class="byline">M.S. in Computer Science</p>
			</div>

			<div>
				<div class="flex justify-between items-end">
					<h3 class="text-lg font-semibold">Manipal Institute of Technology, Manipal</h3>
					<p class="text-stone-400 text-sm">2018 — 2022</p>
				</div>
				<p class="byline">B.Tech in Computer Science & Engineering</p>
			</div>
		</div>
	</div>

	<!-- Research -->
	<div>
		<h2 class="heading2 mb-4">Research Experience</h2>
		<div>
			<h3 class="font-medium mb-2">Graduate Research (Fall 2025)</h3>
			<Workplace
				title="Graduate Student Researcher"
				company="UMass Amherst"
				url="https://bio-nlp.github.io/"
				dates="Sept 2025 – Dec 2025"
				location="Amherst, MA"
			/>
			<ul class="divide-y divide-stone-800 mt-2">
				<li class="py-2 hover:bg-stone-800/50 rounded-md px-2">
					Independent Study: Working in UMass BioNLP Lab with Sunjae Kwon on Ontology-based LLMs for
					Biomedical Applications
				</li>
			</ul>
		</div>
	</div>

	<!-- Coursework -->
	<div class="space-y-12">
		<div>
			<h2 class="heading2 mb-6">Coursework</h2>

			<!-- Current Courses -->
			<div class="mb-10">
				<h3 class="text-sm font-medium text-stone-500 uppercase tracking-wider mb-4">
					Currently Taking (Spring 2026)
				</h3>
				<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
					{#each [{ id: 'COMPSCI 590NN', name: 'Neural Networks in AI and Neuroscience' }, { id: 'COMPSCI 690U', name: 'Computational Biology' }, { id: 'COMPSCI 520', name: 'Software Engineering' }] as course}
						<div
							class="group flex flex-col p-4 bg-stone-900/50 border border-stone-800 rounded-xl hover:border-blue-500/50 transition-all duration-300"
						>
							<span class="text-stone-500 text-xs font-mono mb-1">{course.id}</span>
							<span class="text-stone-100 font-medium group-hover:text-blue-400 transition-colors"
								>{course.name}</span
							>
						</div>
					{/each}
				</div>
			</div>

			<!-- Graduate (Completed) -->
			<div class="mb-10">
				<h3 class="text-sm font-medium text-stone-500 uppercase tracking-wider mb-4">
					Graduate (Fall 2025)
				</h3>
				<div class="flex flex-wrap gap-2">
					{#each [{ id: 'COMPSCI 685', name: 'Advanced Natural Language Processing' }, { id: 'COMPSCI 689', name: 'Advanced Machine Learning' }] as course}
						<div
							class="px-4 py-2 bg-stone-900/30 border border-stone-800 rounded-lg flex items-center gap-3"
						>
							<span class="text-stone-500 text-xs font-mono">{course.id}</span>
							<span class="text-stone-300 text-sm font-medium">{course.name}</span>
						</div>
					{/each}
				</div>
			</div>

			<!-- Undergraduate -->
			<div>
				<h3 class="text-sm font-medium text-stone-500 uppercase tracking-wider mb-4">
					Undergraduate-level
				</h3>
				<div class="flex flex-wrap gap-2">
					{#each ['Compilers', 'Operating Systems', 'Distributed Systems', 'Computer Networks', 'Machine Learning', 'Deep Learning', 'Computer Vision'] as course}
						<span
							class="px-3 py-1.5 bg-stone-900/20 border border-stone-800/50 rounded-full text-stone-400 text-sm font-serif italic"
						>
							{course}
						</span>
					{/each}
				</div>
			</div>
		</div>
	</div>

	<!-- Work -->
	<div>
		<h2 class="heading2 mb-4">Professional Experience</h2>
		<Workplace
			title="Software Developer"
			company="IBM"
			url="https://ibm.com/"
			dates="Aug 2022 – Aug 2025"
			location="Gurgaon, IN"
		>
			<ul class="divide-y divide-stone-800">
				<li class="py-2 hover:bg-stone-800/50 rounded-md px-2">
					Backend Developer integrating IBM Watson systems with Siebel CRM.
				</li>
			</ul>
		</Workplace>
	</div>
</section>

<style lang="postcss">
	@reference "tailwindcss";

	/* Remove all default ul/li styling */
	ul,
	li {
		@apply list-none p-0 m-0;
	}

	.byline {
		@apply font-serif italic text-stone-300;
	}
</style>
