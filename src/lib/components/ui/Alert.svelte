<script lang="ts">
	import type { Snippet } from 'svelte';
	import { alert } from './variants';

	let { tone, children }: { tone?: 'error' | 'success' | 'info'; children: Snippet } = $props();
</script>

<div class={alert({ tone })} role={tone === 'error' ? 'alert' : 'status'}>
	{@render children()}
</div>
