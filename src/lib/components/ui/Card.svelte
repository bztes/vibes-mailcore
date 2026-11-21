<script lang="ts">
	import type { Snippet } from 'svelte';
	import { card } from './variants';

	let {
		title,
		description,
		actions,
		flush = false,
		children
	}: {
		title?: string;
		description?: string;
		actions?: Snippet;
		flush?: boolean;
		children: Snippet;
	} = $props();

	const s = $derived(card({ flush }));
</script>

<section class={s.root()}>
	{#if title || actions}
		<header class={s.header()}>
			<div>
				{#if title}<h2 class={s.title()}>{title}</h2>{/if}
				{#if description}<p class={s.description()}>{description}</p>{/if}
			</div>
			{#if actions}<div class="flex items-center gap-2">{@render actions()}</div>{/if}
		</header>
	{/if}
	<div class={s.body()}>
		{@render children()}
	</div>
</section>
