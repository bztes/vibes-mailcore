<script lang="ts">
	import type { Snippet } from 'svelte';
	import XIcon from '@lucide/svelte/icons/x';

	let {
		open = $bindable(false),
		title,
		description,
		children
	}: {
		open?: boolean;
		title: string;
		description?: string;
		children: Snippet;
	} = $props();
</script>

<dialog
	{@attach (node: HTMLDialogElement) => {
		if (open && !node.open) node.showModal();
		if (!open && node.open) node.close();
	}}
	onclose={() => (open = false)}
	class="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl bg-white p-0 shadow-xl backdrop:bg-zinc-900/40 backdrop:backdrop-blur-[2px]"
>
	{#if open}
		<div class="flex items-start justify-between gap-4 px-5 pt-5">
			<div>
				<h2 class="text-base font-semibold text-zinc-900">{title}</h2>
				{#if description}<p class="mt-1 text-sm text-zinc-500">{description}</p>{/if}
			</div>
			<button
				type="button"
				class="-m-1 rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
				onclick={() => (open = false)}
				aria-label="Close"
			>
				<XIcon class="size-4" />
			</button>
		</div>
		<div class="p-5">
			{@render children()}
		</div>
	{/if}
</dialog>
