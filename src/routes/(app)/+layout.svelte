<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import LogOutIcon from '@lucide/svelte/icons/log-out';
	import { getMe, logout } from '#lib/remote/auth.remote.js';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	const me = $derived(await getMe());

	const nav = $derived([
		{
			href: resolve('/(app)'),
			label: 'Domains',
			active: page.url.pathname === '/' || page.url.pathname.startsWith('/domains')
		},
		...(me.role === 'admin'
			? [
					{
						href: resolve('/(app)/accounts'),
						label: 'Accounts',
						active: page.url.pathname.startsWith('/accounts')
					}
				]
			: []),
		{
			href: resolve('/(app)/settings'),
			label: 'Settings',
			active: page.url.pathname.startsWith('/settings')
		}
	]);
</script>

<div class="min-h-dvh">
	<header class="border-b border-zinc-200 bg-white">
		<div class="mx-auto flex h-14 max-w-5xl items-center gap-6 px-4 sm:px-6">
			<a href={resolve('/(app)')} class="flex items-center gap-2 font-semibold">
				<span class="grid size-7 place-items-center rounded-lg bg-zinc-900 text-white">
					<svg
						viewBox="0 0 24 24"
						class="size-4"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<path
							d="m3 7 9 6 9-6M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z"
						/>
					</svg>
				</span>
				Mailcore
			</a>
			<nav class="flex gap-1">
				{#each nav as item (item.href)}
					<a
						href={item.href}
						class={[
							'rounded-md px-2.5 py-1.5 text-sm font-medium',
							item.active ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-500 hover:text-zinc-900'
						]}
						aria-current={item.active ? 'page' : undefined}
					>
						{item.label}
					</a>
				{/each}
			</nav>
			<div class="ml-auto flex items-center gap-3">
				<span class="hidden text-sm text-zinc-500 sm:inline">{me.email}</span>
				<form {...logout}>
					<button
						class="grid size-8 place-items-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
						aria-label="Sign out"
						title="Sign out"
					>
						<LogOutIcon class="size-4" />
					</button>
				</form>
			</div>
		</div>
	</header>

	<main class="mx-auto max-w-5xl px-4 py-8 sm:px-6">
		{@render children()}
	</main>
</div>
