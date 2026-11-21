<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { input } from './variants';

	let {
		class: className,
		suffix,
		...rest
	}: Omit<HTMLInputAttributes, 'class'> & { class?: string; suffix?: string } = $props();
</script>

{#if suffix}
	<div class="flex items-stretch">
		<input class={input({ class: ['rounded-r-none', className ?? ''] })} {...rest} />
		<span
			class="flex items-center rounded-r-lg border border-l-0 border-zinc-300 bg-zinc-50 px-3 text-sm text-zinc-500"
		>
			{suffix}
		</span>
	</div>
{:else}
	<input class={input({ class: className })} {...rest} />
{/if}
