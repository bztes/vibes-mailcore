<script lang="ts">
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<main class="grid min-h-dvh place-items-center px-4">
	<div class="w-full max-w-sm">
		<div class="mx-auto mb-4 grid size-10 place-items-center rounded-xl bg-zinc-900 text-white">
			<svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="2">
				<path
					d="m3 7 9 6 9-6M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z"
				/>
			</svg>
		</div>
		{@render children()}
	</div>
</main>
