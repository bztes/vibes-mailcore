<script lang="ts">
	import type { HTMLTextareaAttributes } from 'svelte/elements';
	import { input } from './variants';

	let { class: className, ...rest }: Omit<HTMLTextareaAttributes, 'class'> & { class?: string } =
		$props();
</script>

<textarea class={input({ class: ['min-h-20 resize-y font-mono', className ?? ''] })} {...rest}
></textarea>
