<script lang="ts">
	import { onMount } from 'svelte';
	import { Search as SearchIcon, X, Loader2 } from 'lucide-svelte';

	let query = $state('');
	let results = $state<any[]>([]);
	let pagefind: any = $state(null);
	let searching = $state(false);
	let mounted = $state(false);

	onMount(async () => {
		mounted = true;
		try {
			// Pagefind is only available after a build in the static folder.
			// During development, this will likely fail.
			// Using a variable to bypass Vite's static analysis more reliably.
			const pagefindPath = '/pagefind/pagefind.js';
			pagefind = await import(/* @vite-ignore */ pagefindPath);
			await pagefind.init();
		} catch (e) {
			console.warn('Pagefind not found. It will be available after the site is built.', e);
		}
	});

	async function handleSearch() {
		if (!pagefind) return;
		
		if (query.trim().length < 2) {
			results = [];
			return;
		}

		searching = true;
		try {
			const search = await pagefind.search(query);
			// Get the first 5 results
			results = await Promise.all(search.results.slice(0, 5).map((r: any) => r.data()));
		} catch (e) {
			console.error('Search failed', e);
		} finally {
			searching = false;
		}
	}

	function clearSearch() {
		query = '';
		results = [];
	}

	$effect(() => {
		const timeout = setTimeout(() => {
			if (query) {
				handleSearch();
			} else {
				results = [];
			}
		}, 300);

		return () => clearTimeout(timeout);
	});
</script>

<div class="relative mb-8 w-full max-w-md">
	<div class="relative">
		<div class="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500">
			{#if searching}
				<Loader2 class="w-4 h-4 animate-spin" />
			{:else}
				<SearchIcon class="w-4 h-4" />
			{/if}
		</div>
		<input
			type="text"
			bind:value={query}
			placeholder="Search..."
			class="w-full bg-stone-900/50 border border-stone-800 rounded-lg py-2 pl-10 pr-10 text-stone-100 focus:outline-none focus:border-stone-600 focus:ring-1 focus:ring-stone-600 transition-all"
		/>
		{#if query}
			<button
				onclick={clearSearch}
				class="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 transition-colors"
				aria-label="Clear search"
			>
				<X class="w-4 h-4" />
			</button>
		{/if}
	</div>

	{#if results.length > 0}
		<div class="absolute z-50 w-full mt-2 bg-stone-900 border border-stone-800 rounded-lg shadow-2xl overflow-hidden backdrop-blur-sm">
			<div class="max-h-80 overflow-y-auto">
				{#each results as result}
					<a
						href={result.url}
						class="block p-4 hover:bg-stone-800/50 border-b border-stone-800 last:border-0 transition-colors group"
					>
						<h3 class="text-stone-100 font-medium mb-1 group-hover:text-blue-400 transition-colors">
							{result.meta.title}
						</h3>
						<p class="text-stone-400 text-xs line-clamp-2">
							{@html result.excerpt}
						</p>
					</a>
				{/each}
			</div>
			<div class="bg-stone-950/50 p-2 text-[10px] text-stone-500 text-center border-t border-stone-800">
				Search powered by Pagefind
			</div>
		</div>
	{:else if query.length >= 2 && !searching && mounted && pagefind}
		<div class="absolute z-50 w-full mt-2 bg-stone-900 border border-stone-800 rounded-lg p-4 text-stone-400 text-sm shadow-2xl">
			No results found for "<span class="text-stone-200">{query}</span>"
		</div>
	{/if}
</div>
