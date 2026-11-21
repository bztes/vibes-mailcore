<script lang="ts">
	import PlusIcon from '@lucide/svelte/icons/plus';
	import { addManager, removeManager } from '#lib/remote/managers.remote.js';
	import { getMe } from '#lib/remote/auth.remote.js';
	import {
		Alert,
		Badge,
		Button,
		Card,
		ConfirmDelete,
		Dialog,
		Field,
		FormActions,
		Input,
		input,
		table
	} from '#lib/components/ui/index.js';
	import type { DomainDetail } from './types';

	let { domain }: { domain: DomainDetail } = $props();

	const me = $derived(await getMe());
	let adding = $state(false);
	const t = table();
	const { email, _password, role } = addManager.fields;
	const result = $derived(addManager.result);
	const owners = $derived(domain.managers.filter((m) => m.role === 'owner').length);

	function removeMessage(m: DomainDetail['managers'][number]) {
		if (m.id === me.id) return 'You will no longer see this domain.';
		return 'They can no longer access this domain. Their account stays.';
	}
</script>

<Card
	title="People"
	description="Managers handle mailboxes and aliases. Owners can also add people and delete the domain."
	flush
>
	{#snippet actions()}
		{#if domain.canManagePeople}
			<Button variant="secondary" size="sm" onclick={() => (adding = true)}>
				<PlusIcon /> Add person
			</Button>
		{/if}
	{/snippet}

	{#if result}
		<div class="px-5 pt-4">
			<Alert tone="success">
				{#if result.created}
					Account {result.added} created. Share the password with them so they can sign in.
				{:else}
					{result.added} now has access to this domain.
				{/if}
			</Alert>
		</div>
	{/if}

	<div class={t.wrap()}>
		<table class={t.root()}>
			<tbody>
				{#each domain.managers as m (m.id)}
					{@const isLastOwner = m.role === 'owner' && owners === 1}
					<tr class={t.tr()}>
						<td class={t.td()}>
							<div class="flex items-center gap-2">
								<span class="font-medium text-zinc-900">{m.email}</span>
								<Badge tone={m.role === 'owner' ? 'info' : 'neutral'}>
									{m.role === 'owner' ? 'Owner' : 'Manager'}
								</Badge>
								{#if m.id === me.id}<Badge>You</Badge>{/if}
							</div>
							{#if m.name}<div class="text-xs text-zinc-500">{m.name}</div>{/if}
						</td>
						<td class={t.td({ class: 'w-px' })}>
							{#if !isLastOwner && (domain.canManagePeople || m.id === me.id)}
								<div class="flex justify-end">
									<ConfirmDelete
										form={removeManager.for(m.id)}
										id={m.id}
										hidden={{ domainId: domain.id }}
										confirmLabel={m.id === me.id ? 'Leave' : 'Remove'}
										title={m.id === me.id ? `Leave ${domain.name}?` : `Remove ${m.email}?`}
										message={removeMessage(m)}
									/>
								</div>
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</Card>

{#if domain.canManagePeople}
	<Dialog bind:open={adding} title="Add person" description="Give someone access to this domain.">
		<form
			{...addManager.enhance(async (f) => {
				if (await f.submit()) {
					f.element.reset();
					adding = false;
				}
			})}
			class="grid gap-4"
		>
			<input {...addManager.fields.domainId.as('hidden', domain.id)} />
			<Field label="Email" issues={email.issues()} hint="Used to sign in. Can be any address.">
				<Input {...email.as('email')} autocomplete="off" required />
			</Field>
			<Field
				label="Password"
				issues={_password.issues()}
				hint="Only for a new account. Leave empty if they already have one."
			>
				<Input {..._password.as('password')} autocomplete="new-password" />
			</Field>
			<Field label="Role" issues={role.issues()}>
				<select {...role.as('select')} class={input()}>
					<option value="manager" selected>Manager: mailboxes and aliases</option>
					<option value="owner">Owner: also people and deleting the domain</option>
				</select>
			</Field>
			<FormActions>
				<Button type="button" variant="secondary" onclick={() => (adding = false)}>Cancel</Button>
				<Button type="submit" disabled={!!addManager.pending}>Add person</Button>
			</FormActions>
		</form>
	</Dialog>
{/if}
