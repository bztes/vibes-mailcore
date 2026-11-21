<script lang="ts">
	import PlusIcon from '@lucide/svelte/icons/plus';
	import { createAccount, deleteAccount, listAccounts } from '#lib/remote/accounts.remote.js';
	import { getMe } from '#lib/remote/auth.remote.js';
	import {
		Badge,
		Button,
		Card,
		Checkbox,
		ConfirmDelete,
		Dialog,
		Field,
		FormActions,
		Input,
		table
	} from '#lib/components/ui/index.js';
	import ResetPassword from './ResetPassword.svelte';

	const me = $derived(await getMe());
	const accounts = $derived(await listAccounts());

	let adding = $state(false);
	const t = table();
	const { email, name, _password, admin } = createAccount.fields;
</script>

<svelte:head><title>Accounts · Mailcore</title></svelte:head>

<div class="mb-6 flex items-center justify-between gap-4">
	<div>
		<h1 class="text-2xl font-semibold tracking-tight">Accounts</h1>
		<p class="mt-1 text-sm text-zinc-500">People who can sign in here and manage their domains.</p>
	</div>
	<Button onclick={() => (adding = true)}><PlusIcon /> Add account</Button>
</div>

<Card flush>
	<div class={t.wrap()}>
		<table class={t.root()}>
			<thead>
				<tr>
					<th class={t.th()}>Account</th>
					<th class={t.th()}>Domains</th>
					<th class={t.th({ class: 'w-px' })}><span class="sr-only">Actions</span></th>
				</tr>
			</thead>
			<tbody>
				{#each accounts as a (a.id)}
					<tr class={t.tr()}>
						<td class={t.td()}>
							<div class="flex items-center gap-2">
								<span class="font-medium text-zinc-900">{a.email}</span>
								{#if a.role === 'admin'}<Badge tone="info">Admin</Badge>{/if}
								{#if a.id === me.id}<Badge>You</Badge>{/if}
							</div>
							{#if a.name}<div class="text-xs text-zinc-500">{a.name}</div>{/if}
						</td>
						<td class={t.td()}>{a.domains}</td>
						<td class={t.td()}>
							<div class="flex justify-end gap-1">
								<ResetPassword account={a} />
								{#if a.id !== me.id}
									<ConfirmDelete
										form={deleteAccount.for(a.id)}
										id={a.id}
										title="Delete {a.email}?"
										message="They can no longer sign in. Accounts that are the only owner of a domain can't be deleted."
									/>
								{/if}
							</div>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</Card>

<Dialog
	bind:open={adding}
	title="Add account"
	description="They can sign in and add their own domains."
>
	<form
		{...createAccount.enhance(async (f) => {
			if (await f.submit()) {
				f.element.reset();
				adding = false;
			}
		})}
		class="grid gap-4"
	>
		<Field label="Email" issues={email.issues()} hint="Used to sign in. Can be any address.">
			<Input {...email.as('email')} autocomplete="off" required />
		</Field>
		<Field label="Name" issues={name.issues()}>
			<Input {...name.as('text')} autocomplete="off" />
		</Field>
		<Field label="Password" issues={_password.issues()} hint="At least 10 characters">
			<Input {..._password.as('password')} autocomplete="new-password" required />
		</Field>
		<Checkbox
			{...admin.as('checkbox')}
			label="Admin"
			description="Can see all domains and manage accounts."
		/>
		<FormActions>
			<Button type="button" variant="secondary" onclick={() => (adding = false)}>Cancel</Button>
			<Button type="submit" disabled={!!createAccount.pending}>Add account</Button>
		</FormActions>
	</form>
</Dialog>
