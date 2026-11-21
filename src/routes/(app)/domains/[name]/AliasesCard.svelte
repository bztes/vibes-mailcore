<script lang="ts">
	import PlusIcon from '@lucide/svelte/icons/plus';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import ForwardIcon from '@lucide/svelte/icons/forward';
	import { createAlias, deleteAlias } from '#lib/remote/aliases.remote.js';
	import {
		Alert,
		Badge,
		Button,
		Card,
		Checkbox,
		ConfirmDelete,
		Dialog,
		Field,
		FormActions,
		Input,
		Textarea,
		table
	} from '#lib/components/ui/index.js';
	import AliasEdit from './AliasEdit.svelte';
	import type { DomainDetail } from './types';

	let { domain }: { domain: DomainDetail } = $props();

	let adding = $state(false);
	const t = table();
	const { localPart, catchAll, destinations } = createAlias.fields;
	const hasCatchAll = $derived(domain.aliases.some((a) => a.catchAll));
</script>

<Card title="Aliases" description="Addresses that forward to one or more other addresses." flush>
	{#snippet actions()}
		<Button variant="secondary" size="sm" onclick={() => (adding = true)}>
			<PlusIcon /> Add alias
		</Button>
	{/snippet}

	{#if domain.aliases.length === 0}
		<div class="flex items-center gap-3 px-5 py-6 text-sm text-zinc-500">
			<ForwardIcon class="size-4" /> No aliases yet.
		</div>
	{:else}
		<div class={t.wrap()}>
			<table class={t.root()}>
				<thead>
					<tr>
						<th class={t.th()}>Address</th>
						<th class={t.th()}>Forwards to</th>
						<th class={t.th({ class: 'w-px' })}><span class="sr-only">Actions</span></th>
					</tr>
				</thead>
				<tbody>
					{#each domain.aliases as a (a.id)}
						<tr class={t.tr()}>
							<td class={t.td()}>
								<div class="flex items-center gap-2">
									<span class="font-medium text-zinc-900">{a.address}</span>
									{#if a.catchAll}<Badge tone="info">Catch-all</Badge>{/if}
									{#if !a.active}<Badge>Disabled</Badge>{/if}
								</div>
							</td>
							<td class={t.td()}>
								<div class="flex flex-wrap items-center gap-1.5">
									<ArrowRightIcon class="size-3.5 text-zinc-400" />
									{#each a.destinations as dest (dest)}
										<span class="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-700">
											{dest}
										</span>
									{/each}
								</div>
							</td>
							<td class={t.td()}>
								<div class="flex justify-end gap-1">
									<AliasEdit alias={a} />
									<ConfirmDelete
										form={deleteAlias.for(a.id)}
										id={a.id}
										title="Delete {a.address}?"
										message="Mail to this address will be rejected."
									/>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</Card>

<Dialog bind:open={adding} title="Add alias">
	<form
		{...createAlias.enhance(async (f) => {
			if (await f.submit()) {
				f.element.reset();
				adding = false;
			}
		})}
		class="grid gap-4"
	>
		<input {...createAlias.fields.domain.as('hidden', domain.name)} />
		{#each createAlias.fields
			.allIssues()
			?.filter((i) => !i.path.length) ?? [] as issue (issue.message)}
			<Alert tone="error">{issue.message}</Alert>
		{/each}
		<Field label="Address" issues={localPart.issues()}>
			<Input
				{...localPart.as('text')}
				suffix="@{domain.name}"
				placeholder="info"
				autocomplete="off"
				disabled={catchAll.value()}
			/>
		</Field>
		{#if !hasCatchAll}
			<Checkbox
				{...catchAll.as('checkbox')}
				label="Catch-all"
				description="Receive mail sent to any address at this domain that doesn't exist."
			/>
		{/if}
		<Field
			label="Forward to"
			hint="One address per line. Can be on other domains."
			issues={destinations.issues()}
		>
			<Textarea {...destinations.as('text')} rows={3} placeholder="jane@{domain.name}" required />
		</Field>
		<FormActions>
			<Button type="button" variant="secondary" onclick={() => (adding = false)}>Cancel</Button>
			<Button type="submit" disabled={!!createAlias.pending}>Add alias</Button>
		</FormActions>
	</form>
</Dialog>
