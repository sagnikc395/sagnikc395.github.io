<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';
	import { Download } from 'lucide-svelte';
	import Workplace from './Workplace.svelte';
</script>

<Seo
	title="Sagnik Chatterjee – Resume"
	description="software engineer and research , exploring the depths of RL and program synthesis"
/>

<section class="layout-md my-4">
	<h3 class="text-lg font-semibold flex items-center gap-2">
		<span>Download a PDF version of my resume:</span>
		<a
			href="/assets/pdf/SagnikChatterjee-Resume.pdf"
			target="_blank"
			rel="noreferrer"
			class="flex items-center text-blue-600 hover:underline"
		>
			<Download class="w-5 h-5 mr-1" />
			<span class="sr-only">Download Resume</span>
		</a>
	</h3>
</section>

<section class="layout-md py-12">
	<h2 class="heading2">Education</h2>

	<div class="mb-4">
		<div class="flex justify-between items-end">
			<h3 class="text-black text-lg">University of Massachusetts, Amherst</h3>
			<div class="text-neutral-500 mb-0.5">2025 — 2027</div>
		</div>
		<p class="byline">Masters in Computer Science</p>
	</div>

	<div class="mb-4">
		<div class="flex justify-between items-end">
			<h3 class="text-black text-lg">Manipal Institute of Technology, Manipal</h3>
			<div class="text-neutral-500 mb-0.5">2018 — 2022</div>
		</div>
		<p class="byline">BTech in Computer Science and Engineering</p>
	</div>

	<h2 class="heading2">Coursework</h2>
	<h2 class="font-medium mt-4 mb-1">Graduate-level technical coursework:</h2>
	<ul>
		<ul>
			<h2>Fall 2025</h2>
			<li>COMPSCI 532 - Systems for Data Science</li>
			<li>COMPSCI 685 - Advanced Natural Language Processing</li>
			<li>COMPSCI 689 - Machine Learning</li>
		</ul>
	</ul>

	<h4 class="font-medium mt-4 mb-1 text-neutral-600">Undergraduate technical coursework:</h4>
	<ul>
		<li>Compilers</li>
		<li>Operating Systems</li>
		<li>Distributed Systems</li>
		<li>Computer Networks</li>
		<li>Machine Learning</li>
		<li>Deep Learning</li>
		<li>Computer Vision</li>
	</ul>
</section>

<section class="layout-md py-12">
	<h2 class="heading2">Professional Experience</h2>

	<Workplace
		title="Software Developer"
		company="IBM"
		url="https://ibm.com/"
		dates="Aug 2022 – Aug 2025"
		location="Gurgaon, IN"
	>
		<li>
			Work as a Backend Developer in IBM , focussing on integrating IBM Watson systems with Siebel
			CRM system.
		</li>
	</Workplace>
</section>

<style lang="postcss">
	@reference "tailwindcss";
	b {
		@apply font-medium;
	}

	ul {
		@apply list-disc pl-7 marker:text-neutral-700;
	}

	.byline {
		@apply font-serif italic;
	}
</style>
