<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	let {
		label,
		description,
		...rest
	}: HTMLInputAttributes & { label: string; description?: string } = $props();
</script>

<label class="flex cursor-pointer items-start gap-2.5">
	<input type="checkbox" class="mt-0.5 size-4 rounded border-zinc-300 accent-zinc-900" {...rest} />
	<span class="grid gap-0.5">
		<span class="text-sm font-medium text-zinc-800">{label}</span>
		{#if description}<span class="text-xs text-zinc-500">{description}</span>{/if}
	</span>
</label>
