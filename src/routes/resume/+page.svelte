<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';
	import Workplace from './Workplace.svelte';
</script>

<Seo
	title="Sagnik Chatterjee – Resume"
	description="software engineer and research , exploring the depths of RL and program synthesis"
/>

<section class="layout-md py-12">
	<h2 class="heading2">Education</h2>

	<div class="mb-4">
		<div class="flex justify-between items-end">
			<h3 class="text-black text-lg">University of Massachusetts, Amherst</h3>
			<div class="text-neutral-500 mb-0.5">2025 — 2027(expected)</div>
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
		<li>Advanced Computational Complexity (CS 221)</li>
		<li>Random Processes and Algorithms (CS 223)</li>
		<li>Computational Learning Theory (CS 228)</li>
		<li>Advanced Computer Networks (CS 243)</li>
		<li>Advanced Topics in PL/AI (CS 252r)</li>
		<li>Advanced Topics in PL Design (CS 252r)</li>
		<li>Systems Security (CS 263)</li>
		<li>Distributed Systems Engineering (MIT 6.824)</li>
		<li>Shape Analysis (MIT 6.838)</li>
		<li>Robotic Manipulation (MIT 6.843)</li>
		<li>Probability (Stat 210)</li>
		<li>Statistical Inference (Stat 211)</li>
	</ul>

	<h4 class="font-medium mt-4 mb-1">Undergraduate technical coursework:</h4>
	<ul>
		<li>Compilers (CS 153)</li>
		<li>Operating Systems (CS 161)</li>
		<li>Computer Graphics (MIT 6.837)</li>
		<li>Nanotechnology Fabrication (MIT 6.2540)</li>
		<li>Chaotic Dynamical Systems (Math 118r)</li>
		<li>Number Fields (Math 129)</li>
		<li>Differential Topology (Math 132)</li>
		<li>Honors Abstract Algebra (Math 55a)</li>
		<li>Honors Real and Complex Analysis (Math 55b)</li>
	</ul>
</section>

<section class="layout-md py-12">
	<h2 class="heading2">Professional Experience</h2>

	<!-- <Workplace
		title="Founding Engineer"
		company="Modal Labs"
		url="https://modal.com/"
		dates="February 2022 – Current"
		location="New York, NY"
	>
		<li>Founding team member (#4), currently lead Special Projects.</li>
		<li>
			I was the principal engineer for Modal's container runtime, the high-performance Rust system
			that executes Modal Functions. It handles hardware differences across a cluster that spans
			multiple clouds (100,000 CPUs and 5,000 GPUs); while dealing with real-time, data-intensive
			workloads from thousands of customers.
		</li>
		<li>
			I developed Modal's high-throughput content-addressed file system, tiered cache over petabytes
			of data, a novel <a class="link" href="https://modal.com/blog/serverless-http"
				>serverless HTTP stack</a
			>, distributed
			<a class="link" href="https://modal.com/docs/guide/tunnels">TLS relays</a>, container
			sandboxing via
			<a class="link" href="https://gvisor.dev/users/">gVisor</a>,
			<a class="link" href="https://modal.com/docs/guide/private-networking"
				>eBPF network infrastructure</a
			>, and a
			<a class="link" href="https://modal.com/blog/vprox">WireGuard-based VPN</a>.
		</li>
		<li>
			I was also Modal's first product-focused engineer and designer. While building <a
				class="link"
				href="https://modal.com">modal.com</a
			>, I developed a feeling for crafting interfaces to make complex systems legible.
		</li>
		<li>
			For 3 years, was #1 committer, made technical decisions like adopting Rust and Svelte despite
			early skepticism and shaped the long-term direction.
		</li>
	</Workplace> -->
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
