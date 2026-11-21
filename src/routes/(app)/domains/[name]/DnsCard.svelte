<script lang="ts">
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
	import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
	import CircleAlertIcon from '@lucide/svelte/icons/circle-alert';
	import CircleXIcon from '@lucide/svelte/icons/circle-x';
	import { getDomain, getDomainDns } from '#lib/remote/domains.remote.js';
	import { Alert, Badge, Button, Card, CopyButton } from '#lib/components/ui/index.js';

	let { name, mailHostname, verified }: { name: string; mailHostname: string; verified: boolean } =
		$props();

	const query = $derived(getDomainDns(name));
	const result = $derived(await query);
	const records = $derived(result.records);

	// The DNS check verifies the domain server-side; update the page header when that happens.
	$effect(() => {
		if (result.verified && !verified) void getDomain(name).refresh();
	});
	const problems = $derived(records.filter((r) => r.status !== 'ok').length);

	const statusTone = { ok: 'ok', warn: 'warn', missing: 'bad' } as const;
	const statusLabel = { ok: 'OK', warn: 'Check', missing: 'Missing' } as const;

	let refreshing = $state(false);
	async function refresh() {
		refreshing = true;
		try {
			await query.refresh();
		} finally {
			refreshing = false;
		}
	}
</script>

<Card
	title="DNS records"
	description={problems === 0
		? 'Everything is set up. Mail for this domain arrives here and is signed.'
		: 'Add these records at your DNS provider. Changes can take a while to show up.'}
>
	{#snippet actions()}
		{#if problems === 0}
			<Badge tone="ok"><CircleCheckIcon /> All set</Badge>
		{:else}
			<Badge tone="warn">{problems} to fix</Badge>
		{/if}
		<Button
			variant="ghost"
			size="icon"
			onclick={refresh}
			disabled={refreshing}
			title="Check again"
			aria-label="Check again"
		>
			<RefreshCwIcon class={refreshing ? 'animate-spin' : ''} />
		</Button>
	{/snippet}

	{#if !result.verified}
		<div class="mb-4">
			<Alert>
				Add the <strong>DKIM</strong> record first: it proves this domain is yours. Until it is
				found, mail for {name} is not accepted.
			</Alert>
		</div>
	{/if}

	<details open={problems > 0} class="group">
		<summary
			class="cursor-pointer text-sm font-medium text-zinc-600 select-none hover:text-zinc-900"
		>
			<span class="group-open:hidden">Show records</span>
			<span class="hidden group-open:inline">Hide records</span>
		</summary>

		<ul class="mt-4 grid gap-3">
			{#each records as r (r.key)}
				<li class="rounded-lg border border-zinc-200 p-4">
					<div class="flex flex-wrap items-center justify-between gap-2">
						<div class="flex items-center gap-2">
							{#if r.status === 'ok'}
								<CircleCheckIcon class="size-4 text-emerald-600" />
							{:else if r.status === 'warn'}
								<CircleAlertIcon class="size-4 text-amber-500" />
							{:else}
								<CircleXIcon class="size-4 text-rose-500" />
							{/if}
							<span class="text-sm font-medium">{r.label}</span>
						</div>
						<Badge tone={statusTone[r.status]}>{statusLabel[r.status]}</Badge>
					</div>

					<dl class="mt-3 grid grid-cols-[4.5rem_1fr] gap-x-3 gap-y-1.5 text-sm">
						<dt class="text-zinc-500">Type</dt>
						<dd class="font-mono">{r.type}</dd>
						<dt class="text-zinc-500">Name</dt>
						<dd class="flex items-center gap-1">
							<span class="font-mono break-all">{r.host}</span>
							<CopyButton value={r.host} label="Copy name" />
							{#if r.host !== '@'}
								<span class="text-xs text-zinc-400">({r.host}.{name})</span>
							{/if}
						</dd>
						<dt class="text-zinc-500">Value</dt>
						<dd class="flex items-start gap-1">
							<span class="font-mono text-xs leading-5 break-all">{r.value}</span>
							<CopyButton value={r.value} label="Copy value" />
						</dd>
					</dl>

					{#if r.status !== 'ok'}
						<p class="mt-3 text-xs text-zinc-500">
							{#if r.hint}{r.hint}{:else if r.found.length}Currently: <span
									class="font-mono break-all"
								>
									{r.found.join(' | ')}
								</span>{:else}Not found yet.{/if}
						</p>
					{/if}
				</li>
			{/each}
		</ul>

		<p class="mt-4 text-xs text-zinc-500">
			Once per server: your hosting provider must set the reverse DNS (PTR) of the server's IP to
			<span class="font-mono">{mailHostname}</span>, and
			<span class="font-mono">{mailHostname}</span> needs an A record pointing to the server.
		</p>
	</details>
</Card>
