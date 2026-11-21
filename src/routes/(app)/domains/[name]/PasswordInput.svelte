<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import EyeIcon from '@lucide/svelte/icons/eye';
	import EyeOffIcon from '@lucide/svelte/icons/eye-off';
	import WandIcon from '@lucide/svelte/icons/wand-sparkles';
	import { input } from '#lib/components/ui/index.js';
	import { generatePassword } from '#lib/format.js';

	let {
		onGenerate,
		...rest
	}: Omit<HTMLInputAttributes, 'type' | 'class'> & { onGenerate: (pw: string) => void } = $props();

	let visible = $state(false);
</script>

<div class="flex gap-2">
	<div class="relative flex-1">
		<input
			{...rest}
			type={visible ? 'text' : 'password'}
			class={input({ class: 'pr-9 font-mono' })}
		/>
		<button
			type="button"
			class="absolute inset-y-0 right-0 grid w-9 place-items-center text-zinc-400 hover:text-zinc-700"
			onclick={() => (visible = !visible)}
			aria-label={visible ? 'Hide password' : 'Show password'}
		>
			{#if visible}<EyeOffIcon class="size-4" />{:else}<EyeIcon class="size-4" />{/if}
		</button>
	</div>
	<button
		type="button"
		class="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
		onclick={() => {
			onGenerate(generatePassword());
			visible = true;
		}}
	>
		<WandIcon class="size-4" /> Generate
	</button>
</div>
