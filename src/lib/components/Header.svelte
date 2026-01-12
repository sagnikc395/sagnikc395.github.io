<script lang="ts">
	import { page } from '$app/stores';

	const links = [
		{ name: 'projects', href: '/projects' },
		{ name: 'resume', href: '/resume' },
		{ name: 'blog', href: '/blog' }
	];
	let pageTitle: string | null = null;
	
	// Subscribe to page store to update pageTitle
	$: {
		const link = links.find(({ href }) => href === $page.url.pathname);
		if (link) {
			pageTitle = link.name.charAt(0).toUpperCase() + link.name.slice(1);
		} else {
			pageTitle = null;
		}
	}
</script>

<header
	class="layout-md flex justify-between items-start"
	data-sveltekit-noscroll
	data-sveltekit-preload-code="eager"
>
	<h1 class="font-bold text-stone-900 dark:text-stone-100 text-2xl mb-6">
		<a href="/">Sagnik Chatterjee</a>
		{#if pageTitle}
			<span class="page-title">
				<span class="text-stone-400 dark:text-stone-600">-</span>
				{pageTitle}
			</span>
		{/if}
	</h1>
	<nav>
		{#each links as link (link.href)}
			<a
				href={link.href}
				class="hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
				class:text-stone-900={$page.url.pathname === link.href}
				class:dark:text-stone-100={$page.url.pathname === link.href}
			>
				{link.name}
			</a>
		{/each}
	</nav>
</header>

<style lang="postcss">
	@reference "tailwindcss";
	nav {
		@apply flex items-center text-stone-500 dark:text-stone-400 justify-end space-x-6 text-lg py-0.5;
	}

	.page-title {
		@apply font-light;
	}

	@media (max-width: 580px) {
		.page-title {
			@apply block text-xl;
		}

		.page-title :first-child {
			@apply hidden;
		}
	}

	@media (max-width: 420px) {
		nav {
			@apply flex-col items-end space-x-0 space-y-2;
		}
	}
</style>