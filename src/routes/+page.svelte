<script>
	import Seo from '$lib/components/Seo.svelte';
	import { ArrowUpRight } from 'lucide-svelte';
	// let featuredProjects = [
	// 	{
	// 		name: 'sshx',
	// 		href: '/projects#sshx',
	// 		desc: 'secure web-based, collaborative terminal'
	// 	},
	// 	{
	// 		name: 'Bore',
	// 		href: '/projects#bore',
	// 		desc: 'bypass your NAT in just 400 lines of code',
	// 		aside: '9500+ stars on GitHub'
	// 	},
	// 	{
	// 		name: 'Percival',
	// 		href: '/projects#percival',
	// 		desc: 'reactive notebooks for exploratory data analysis'
	// 	},
	// 	{
	// 		name: 'Rustpad',
	// 		href: '/projects#rustpad',
	// 		desc: 'self-hosted collaborative text editor',
	// 		aside: '6M+ downloads'
	// 	},
	// 	{
	// 		name: 'Crepe',
	// 		href: '/projects#crepe',
	// 		desc: 'compiled Datalog language in Rust',
	// 		aside: 'used by distributed databases & security systems'
	// 	},
	// 	{
	// 		name: 'FastSeg',
	// 		href: '/projects#fastseg',
	// 		desc: 'real-time semantic segmentation for self-driving cars'
	// 	},
	// 	{
	// 		name: 'Set with Friends',
	// 		href: '/projects#setwithfriends',
	// 		desc: 'online multiplayer card game',
	// 		aside: '30M+ page views, 900K+ users'
	// 	}
	// ];
	// featuredProjects.length = 0;
</script>

<Seo
	title="Sagnik Chatterjee"
	description="Software engineer, researcher interested in program synthesis."
/>

<p
	class="layout-md text-neutral-700 text-lg md:text-xl leading-tight font-light mb-16"
	id="sagnik-is"
>
	<span class="neutral">is a</span>
	software engineer<span class="neutral">,ai fanboy </span>
	<br />
	and researcher<span class="neutral"></span>
	<br />
</p>

<div class="layout-md text-lg md:text-xl space-y-14 max-w-4xl mx-auto">
	<!-- hero -->
	<div
		class="flex flex-col md:flex-row items-center md:items-start space-y-10 md:space-y-0 md:space-x-10"
	>
		<!-- Profile Image -->
		<div class="w-full md:w-1/3 flex justify-center items-center md:justify-start">
			<img
				alt="sagnik chilling in his natural place"
				src="/assets/images/profile.jpeg"
				class="rounded-xl w-64 object-cover"
			/>
		</div>

		<!-- Text Content -->
		<div class="w-full md:w-2/3 space-y-5">
			<p class="text-xl font-semibold">Hi, I’m Sagnik</p>
			<p class="text-lg md:text-xl">
				I'm primarily interested in compilers and program synthesis, but I also make time to explore
				reinforcement learning and energy-based models in my free time.
			</p>
			<p>
				After sunset, you’ll usually find me nose-deep in a history book—anything from ancient
				empires to modern revolutions. If I’m not reading, I’m probably out chasing pavement on a
				long run, clearing my head one mile at a time. I’ve got a soft spot for brutal workouts and
				quiet routines, and I genuinely believe a good sweat can fix almost anything. Weekends are
				for recharging: wandering through random Wikipedia rabbit holes, meal-prepping like a monk,
				or just planning my next read.
			</p>
		</div>
	</div>
	<!-- beliefs !~!! -->
	<hr />
	<div class="text-center space-y-4">
		<h2 class="text-xl md:text-2xl font-semibold underline">Some things I believe in:</h2>
		<ul class=" list-inside space-y-1 text-neutral-500">
			<li>Complexity is often just poor organization.</li>
			<li>Mastery begins where imitation ends.</li>
			<li>Clarity is speed disguised as patience.</li>
			<li>Curiosity scales better than discipline.</li>
			<li>Abstractions are escape hatches, not destinations.</li>
			<li>You don’t need permission to be excellent.</li>
			<li>The best optimizations start with deletion.</li>
			<li>Most truths are discovered backwards.</li>
			<li>Tools shape thought—choose wisely.</li>
			<li>Nothing works until it works with people.</li>
			<li>Fundamentally, every bottleneck is a skill issue.</li>
		</ul>
	</div>

	<!-- rn dont render the projects yet
	{#if featuredProjects.length > 0}
		<div class="leading-snug space-y-4">
			<p class="pb-2">Notable open-source work:</p>

			{#each featuredProjects as project}
				<a class="project-pair" href={project.href}>
					<div class="text-black font-medium">
						{project.name}
						<ArrowUpRight size={18} class="inline text-neutral-400" />
					</div>
					<div>
						<p>{project.desc}</p>
						{#if project.aside}
							<aside>{project.aside}</aside>
						{/if}
					</div>
				</a>
			{/each}
		</div>
	{/if} -->
	<div class="items-center">
		<p class="text-center text-lg md:text-xl">
			I'm also building a digital garden of my knowledge and notes on AI and PL. <br />Follow here :
			<a href="https://sagnikc395.github.io/notes" class="underline italic" rel="_noreferrer"
				>sagnik`s digital garden</a
			>
		</p>
	</div>
	<hr />
	<!-- other stuff that interests me -->
	<div class="text-center text-zinc-800">
		<p>Other interests: endurance running, F1, maths and writing fiction</p>
	</div>
</div>

<style lang="postcss">
	@reference "tailwindcss";
	.g {
		@apply text-neutral-900;
	}
	em {
		@apply font-serif text-[110%] leading-[100%];
	}

	.project-pair {
		@apply grid sm:grid-cols-[1fr,2fr] gap-y-1 -mx-3 px-3 py-2 hover:bg-neutral-100 transition-colors;
	}

	aside {
		@apply mt-0.5 text-base text-slate-700;
	}

	/* Correction for vertical navigation links on mobile. */
	@media (max-width: 420px) {
		#sagnik-is {
			@apply -mt-10;
		}
	}
</style>
