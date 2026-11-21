<script lang="ts">
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import { updateMailbox } from '#lib/remote/mailboxes.remote.js';
	import { Button, Checkbox, Dialog, Field, FormActions, Input } from '#lib/components/ui/index.js';
	import { GB } from '#lib/schemas.js';
	import PasswordInput from './PasswordInput.svelte';
	import type { MailboxRow } from './types';

	let { mailbox }: { mailbox: MailboxRow } = $props();

	let open = $state(false);
	const form = $derived(updateMailbox.for(mailbox.id));
</script>

<Button
	variant="ghost"
	size="icon"
	onclick={() => (open = true)}
	title="Edit"
	aria-label="Edit {mailbox.address}"
>
	<PencilIcon />
</Button>

<Dialog bind:open title="Edit {mailbox.address}">
	<form
		{...form.enhance(async (f) => {
			if (await f.submit()) open = false;
		})}
		class="grid gap-4"
	>
		<input {...form.fields.id.as('hidden', mailbox.id)} />
		<Field label="Name" issues={form.fields.name.issues()}>
			<Input {...form.fields.name.as('text', mailbox.name)} autocomplete="off" />
		</Field>
		<Field
			label="New password"
			hint="Leave empty to keep the current password"
			issues={form.fields._password.issues()}
		>
			<PasswordInput
				{...form.fields._password.as('password')}
				autocomplete="new-password"
				onGenerate={(pw: string) => form.fields._password.set(pw)}
			/>
		</Field>
		<Field label="Storage limit (GB)" issues={form.fields.quotaGb.issues()}>
			<Input
				{...form.fields.quotaGb.as('number', Math.round(mailbox.quotaBytes / GB))}
				min="1"
				max="2000"
				required
			/>
		</Field>
		<Checkbox
			{...form.fields.active.as('checkbox', mailbox.active)}
			label="Active"
			description="Inactive mailboxes can't log in and don't receive mail."
		/>
		<FormActions>
			<Button type="button" variant="secondary" onclick={() => (open = false)}>Cancel</Button>
			<Button type="submit" disabled={!!form.pending}>Save</Button>
		</FormActions>
	</form>
</Dialog>
