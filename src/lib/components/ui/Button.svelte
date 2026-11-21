<script lang="ts">
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';
	import { button, type ButtonVariants } from './variants';

	type Props = ButtonVariants & { class?: string } & (
			| ({ href: string } & Omit<HTMLAnchorAttributes, 'class'>)
			| ({ href?: undefined } & Omit<HTMLButtonAttributes, 'class'>)
		);

	let { variant, size, class: className, children, ...rest }: Props = $props();
</script>

{#if rest.href !== undefined}
	<a class={button({ variant, size, class: className })} {...rest as HTMLAnchorAttributes}>
		{@render children?.()}
	</a>
{:else}
	<button class={button({ variant, size, class: className })} {...rest as HTMLButtonAttributes}>
		{@render children?.()}
	</button>
{/if}
