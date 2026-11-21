<script lang="ts">
	import { resolve } from '$app/paths';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import GlobeIcon from '@lucide/svelte/icons/globe';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import { createDomain, listDomains, listOwners } from '#lib/remote/domains.remote.js';
	import { getMe } from '#lib/remote/auth.remote.js';
	import {
		Badge,
		Button,
		Card,
		Dialog,
		Field,
		FormActions,
		Input,
		input
	} from '#lib/components/ui/index.js';

	const me = $derived(await getMe());
	const domains = $derived(await listDomains());
	const owners = $derived(me.role === 'admin' ? await listOwners() : []);

	let adding = $state(false);
	const { name, ownerId } = createDomain.fields;
</script>

<svelte:head><title>Domains · Mailcore</title></svelte:head>

<div class="mb-6 flex items-center justify-between gap-4">
	<div>
		<h1 class="text-2xl font-semibold tracking-tight">Domains</h1>
		<p class="mt-1 text-sm text-zinc-500">Each domain has its own mailboxes and aliases.</p>
	</div>
	<Button onclick={() => (adding = true)}><PlusIcon /> Add domain</Button>
</div>

{#if domains.length === 0}
	<Card>
		<div class="grid place-items-center gap-3 py-10 text-center">
			<div class="grid size-11 place-items-center rounded-full bg-zinc-100 text-zinc-500">
				<GlobeIcon class="size-5" />
			</div>
			<div>
				<p class="font-medium">No domains yet</p>
				<p class="mt-1 text-sm text-zinc-500">Add the domain you want to receive mail for.</p>
			</div>
			<Button variant="secondary" onclick={() => (adding = true)}><PlusIcon /> Add domain</Button>
		</div>
	</Card>
{:else}
	<Card flush>
		<ul class="divide-y divide-zinc-100">
			{#each domains as d (d.id)}
				<li>
					<a
						href={resolve('/(app)/domains/[name]', { name: d.name })}
						class="flex items-center gap-4 px-5 py-4 hover:bg-zinc-50"
					>
						<div class="grid size-9 place-items-center rounded-lg bg-zinc-100 text-zinc-500">
							<GlobeIcon class="size-4" />
						</div>
						<div class="min-w-0 flex-1">
							<p class="truncate font-medium">{d.name}</p>
							<p class="text-sm text-zinc-500">
								{d.mailboxes} mailbox{d.mailboxes === 1 ? '' : 'es'} · {d.aliases} alias{d.aliases ===
								1
									? ''
									: 'es'}
								{#if d.managers.some((m) => m !== me.email)}· {d.managers.join(', ')}{/if}
							</p>
						</div>
						{#if !d.verified}<Badge tone="warn">Not verified</Badge>{/if}
						{#if !d.active}<Badge>Disabled</Badge>{/if}
						<ChevronRightIcon class="size-4 text-zinc-400" />
					</a>
				</li>
			{/each}
		</ul>
	</Card>
{/if}

<Dialog
	bind:open={adding}
	title="Add domain"
	description="You'll get the DNS records to set on the next page. Mail is accepted once they show the domain is yours."
>
	<form {...createDomain} class="grid gap-4">
		<Field label="Domain" issues={name.issues()} hint="Without www, e.g. example.com">
			<Input {...name.as('text')} placeholder="example.com" autocomplete="off" required />
		</Field>
		{#if owners.length > 1}
			<Field label="Manager">
				<select {...ownerId.as('select')} class={input()}>
					{#each owners as o (o.id)}
						<option value={o.id} selected={o.id === me.id}>{o.email}</option>
					{/each}
				</select>
			</Field>
		{/if}
		<FormActions>
			<Button type="button" variant="secondary" onclick={() => (adding = false)}>Cancel</Button>
			<Button type="submit" disabled={!!createDomain.pending}>Add domain</Button>
		</FormActions>
	</form>
</Dialog>
