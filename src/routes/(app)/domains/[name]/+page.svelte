<script lang="ts">
	import { resolve } from '$app/paths';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import { deleteDomain, getDomain } from '#lib/remote/domains.remote.js';
	import { Badge, ConfirmDelete } from '#lib/components/ui/index.js';
	import DnsCard from './DnsCard.svelte';
	import MailboxesCard from './MailboxesCard.svelte';
	import AliasesCard from './AliasesCard.svelte';
	import ClientSettings from './ClientSettings.svelte';
	import ManagersCard from './ManagersCard.svelte';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	const domain = $derived(await getDomain(params.name));
</script>

<svelte:head><title>{domain.name} · Mailcore</title></svelte:head>

<a
	href={resolve('/(app)')}
	class="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900"
>
	<ArrowLeftIcon class="size-4" /> Domains
</a>

<div class="mb-6 flex flex-wrap items-center justify-between gap-4">
	<div class="flex items-center gap-3">
		<h1 class="text-2xl font-semibold tracking-tight">{domain.name}</h1>
		{#if !domain.verified}<Badge tone="warn">Not verified</Badge>{/if}
		{#if !domain.active}<Badge>Disabled</Badge>{/if}
	</div>
	{#if domain.canManagePeople}
		<ConfirmDelete
			form={deleteDomain.for(domain.id)}
			id={domain.id}
			label="Delete domain"
			title="Delete {domain.name}?"
			message="All mailboxes and aliases of this domain are removed for every manager and mail for it is no longer accepted. Stored emails stay on disk."
		/>
	{/if}
</div>

<div class="grid gap-6">
	<svelte:boundary>
		<DnsCard name={domain.name} mailHostname={domain.mailHostname} verified={domain.verified} />
		{#snippet pending()}
			<div class="h-20 animate-pulse rounded-xl border border-zinc-200 bg-white"></div>
		{/snippet}
	</svelte:boundary>
	<MailboxesCard {domain} />
	<AliasesCard {domain} />
	<ManagersCard {domain} />
	<ClientSettings mailHostname={domain.mailHostname} />
</div>
