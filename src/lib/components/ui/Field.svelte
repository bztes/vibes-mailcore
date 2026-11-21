<script lang="ts">
	import type { Snippet } from 'svelte';
	import { field } from './variants';

	let {
		label,
		hint,
		issues,
		children
	}: {
		label: string;
		hint?: string;
		issues?: { message: string }[];
		children: Snippet;
	} = $props();

	const s = field();
</script>

<label class={s.root()}>
	<span class={s.label()}>{label}</span>
	{@render children()}
	{#each issues ?? [] as issue (issue.message)}
		<span class={s.issue()}>{issue.message}</span>
	{:else}
		{#if hint}<span class={s.hint()}>{hint}</span>{/if}
	{/each}
</label>
