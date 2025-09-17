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
					<p class="text-neutral-500 text-sm">2025 — 2027</p>
				</div>
				<p class="byline">M.S. in Computer Science</p>
			</div>

			<div>
				<div class="flex justify-between items-end">
					<h3 class="text-lg font-semibold">Manipal Institute of Technology, Manipal</h3>
					<p class="text-neutral-500 text-sm">2018 — 2022</p>
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
				dates="Sept 2025 – (current)"
				location="Amherst, MA"
			/>
			<ul class="divide-y divide-neutral-200 mt-2">
				<li class="py-2 hover:bg-neutral-50 rounded-md px-2">
					Independent Study: Working in UMass BioNLP Lab with Sunjae Kwon on Ontology-based LLMs for
					Biomedical Applications
				</li>
			</ul>
		</div>
	</div>

	<!-- Coursework -->
	<div>
		<h2 class="heading2 mb-4">Coursework</h2>
		<div class="mb-3">
			<h3 class="font-medium mb-2">Graduate-level (Fall 2025)</h3>
			<ul class="divide-y divide-neutral-200">
				<li class="py-2 hover:bg-neutral-50 rounded-md px-2">
					COMPSCI 685 – Advanced Natural Language Processing
				</li>
				<li class="py-2 hover:bg-neutral-50 rounded-md px-2">
					COMPSCI 689 – Advanced Machine Learning
				</li>
			</ul>
		</div>

		<div>
			<h3 class="font-medium mb-2">Undergraduate-level</h3>
			<ul class="divide-y divide-neutral-200">
				<li class="py-2 hover:bg-neutral-50 rounded-md px-2">Compilers</li>
				<li class="py-2 hover:bg-neutral-50 rounded-md px-2">Operating Systems</li>
				<li class="py-2 hover:bg-neutral-50 rounded-md px-2">Distributed Systems</li>
				<li class="py-2 hover:bg-neutral-50 rounded-md px-2">Computer Networks</li>
				<li class="py-2 hover:bg-neutral-50 rounded-md px-2">Machine Learning</li>
				<li class="py-2 hover:bg-neutral-50 rounded-md px-2">Deep Learning</li>
				<li class="py-2 hover:bg-neutral-50 rounded-md px-2">Computer Vision</li>
			</ul>
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
			<ul class="divide-y divide-neutral-200">
				<li class="py-2 hover:bg-neutral-50 rounded-md px-2">
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
		@apply font-serif italic text-neutral-700;
	}
</style>
