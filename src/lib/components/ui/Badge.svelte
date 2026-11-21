<script lang="ts">
	import type { Snippet } from 'svelte';
	import { badge, type BadgeVariants } from './variants';

	let { tone, children }: BadgeVariants & { children: Snippet } = $props();
</script>

<span class={badge({ tone })}>{@render children()}</span>
