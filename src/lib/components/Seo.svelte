<script lang="ts">
	export let title: string;
	export let ogTitle: string | null = null;
	export let description: string;
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<meta property="og:title" content={ogTitle ?? title} />
	<meta property="og:description" content={description} />
	<meta property="og:image" content="https://sagnikc395.github.io/assets/images/catush.jpeg" />
	<meta name="twitter:card" content="summary_large_image" />
</svelte:head>
