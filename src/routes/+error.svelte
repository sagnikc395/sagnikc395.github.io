<script lang="ts">
	import { page } from '$app/stores';

	import { Bug } from 'lucide-svelte';
</script>

<div class="layout-md">
	<div class="">
		<Bug class="mr-2" />
		<span class="font-medium">{$page.status}</span>
		<div class="mx-4 h-8 border-l border-black" />
		{$page.error?.message}
	</div>
</div>
