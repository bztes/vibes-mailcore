<script lang="ts">
	import PlusIcon from '@lucide/svelte/icons/plus';
	import InboxIcon from '@lucide/svelte/icons/inbox';
	import { createMailbox, deleteMailbox } from '#lib/remote/mailboxes.remote.js';
	import {
		Badge,
		Button,
		Card,
		ConfirmDelete,
		Dialog,
		Field,
		FormActions,
		Input,
		table
	} from '#lib/components/ui/index.js';
	import { formatBytes } from '#lib/format.js';
	import PasswordInput from './PasswordInput.svelte';
	import MailboxEdit from './MailboxEdit.svelte';
	import type { DomainDetail } from './types';

	let { domain }: { domain: DomainDetail } = $props();

	let adding = $state(false);
	const t = table();
	const { localPart, name, _password, quotaGb } = createMailbox.fields;
</script>

<Card title="Mailboxes" description="Accounts that store mail and can log in." flush>
	{#snippet actions()}
		<Button variant="secondary" size="sm" onclick={() => (adding = true)}>
			<PlusIcon /> Add mailbox
		</Button>
	{/snippet}

	{#if domain.mailboxes.length === 0}
		<div class="flex items-center gap-3 px-5 py-6 text-sm text-zinc-500">
			<InboxIcon class="size-4" /> No mailboxes yet.
		</div>
	{:else}
		<div class={t.wrap()}>
			<table class={t.root()}>
				<thead>
					<tr>
						<th class={t.th()}>Address</th>
						<th class={t.th()}>Storage</th>
						<th class={t.th({ class: 'w-px' })}><span class="sr-only">Actions</span></th>
					</tr>
				</thead>
				<tbody>
					{#each domain.mailboxes as m (m.id)}
						{@const pct =
							m.usedBytes === undefined ? 0 : Math.min(100, (m.usedBytes / m.quotaBytes) * 100)}
						<tr class={t.tr()}>
							<td class={t.td()}>
								<div class="flex items-center gap-2">
									<span class="font-medium text-zinc-900">{m.address}</span>
									{#if !m.active}<Badge>Disabled</Badge>{/if}
								</div>
								{#if m.name}<div class="text-xs text-zinc-500">{m.name}</div>{/if}
							</td>
							<td class={t.td({ class: 'min-w-40' })}>
								<div class="text-xs text-zinc-500">
									{m.usedBytes === undefined ? '–' : formatBytes(m.usedBytes)} of {formatBytes(
										m.quotaBytes
									)}
								</div>
								<div class="mt-1 h-1.5 w-full max-w-40 overflow-hidden rounded-full bg-zinc-100">
									<div
										class={['h-full rounded-full', pct > 90 ? 'bg-rose-500' : 'bg-zinc-800']}
										style:width="{pct}%"
									></div>
								</div>
							</td>
							<td class={t.td()}>
								<div class="flex justify-end gap-1">
									<MailboxEdit mailbox={m} />
									<ConfirmDelete
										form={deleteMailbox.for(m.id)}
										id={m.id}
										title="Delete {m.address}?"
										message="The address stops working immediately. Stored emails stay on disk."
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

<Dialog bind:open={adding} title="Add mailbox">
	<form
		{...createMailbox.enhance(async (f) => {
			if (await f.submit()) {
				f.element.reset();
				adding = false;
			}
		})}
		class="grid gap-4"
	>
		<input {...createMailbox.fields.domain.as('hidden', domain.name)} />
		<Field label="Address" issues={localPart.issues()}>
			<Input
				{...localPart.as('text')}
				suffix="@{domain.name}"
				placeholder="jane"
				autocomplete="off"
				required
			/>
		</Field>
		<Field label="Name" hint="Optional, only shown here" issues={name.issues()}>
			<Input {...name.as('text')} placeholder="Jane Doe" autocomplete="off" />
		</Field>
		<Field label="Password" issues={_password.issues()} hint="At least 10 characters">
			<PasswordInput
				{..._password.as('password')}
				autocomplete="new-password"
				required
				onGenerate={(pw: string) => _password.set(pw)}
			/>
		</Field>
		<Field label="Storage limit (GB)" issues={quotaGb.issues()}>
			<Input {...quotaGb.as('number', domain.defaultQuotaGb)} min="1" max="2000" required />
		</Field>
		<FormActions>
			<Button type="button" variant="secondary" onclick={() => (adding = false)}>Cancel</Button>
			<Button type="submit" disabled={!!createMailbox.pending}>Add mailbox</Button>
		</FormActions>
	</form>
</Dialog>
