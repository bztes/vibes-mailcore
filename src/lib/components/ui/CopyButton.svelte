<script lang="ts">
	import CopyIcon from '@lucide/svelte/icons/copy';
	import CheckIcon from '@lucide/svelte/icons/check';

	let { value, label = 'Copy' }: { value: string; label?: string } = $props();
	let copied = $state(false);

	async function copy() {
		await navigator.clipboard.writeText(value);
		copied = true;
		setTimeout(() => (copied = false), 1500);
	}
</script>

<button
	type="button"
	onclick={copy}
	class="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
	aria-label={label}
	title={label}
>
	{#if copied}
		<CheckIcon class="size-3.5 text-emerald-600" />
	{:else}
		<CopyIcon class="size-3.5" />
	{/if}
</button>
