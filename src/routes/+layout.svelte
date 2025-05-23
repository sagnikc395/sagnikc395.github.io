<script lang="ts">
	import '../app.css';

	import { browser, dev } from '$app/environment';

	import { fly } from 'svelte/transition';

	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import type { LayoutData } from './$types';

	let { data, children } = $props();

	const isMobile = browser && /Android|iPhone/i.test(navigator.userAgent);
	const reducedMotion = browser && matchMedia('(prefers-reduced-motion: reduce)').matches;
</script>

<Header />
{#if isMobile || reducedMotion}
	<!--
    Disable page transitions on mobile due to a browser engine bug.
    Also disable them for reduced-motion users.
  -->
	<main>
		{@render children()}
	</main>
{:else}
	{#key data.pathname}
		<main in:fly={{ x: -10, duration: 350, delay: 350 }} out:fly={{ y: 5, duration: 350 }}>
			{@render children()}
		</main>
	{/key}
{/if}

<Footer />
