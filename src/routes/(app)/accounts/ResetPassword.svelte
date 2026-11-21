<script lang="ts">
	import KeyRoundIcon from '@lucide/svelte/icons/key-round';
	import { resetAccountPassword } from '#lib/remote/accounts.remote.js';
	import { Button, Dialog, Field, FormActions, Input } from '#lib/components/ui/index.js';

	let { account }: { account: { id: string; email: string } } = $props();

	let open = $state(false);
	const form = $derived(resetAccountPassword.for(account.id));
</script>

<Button
	variant="ghost"
	size="icon"
	onclick={() => (open = true)}
	title="Set password"
	aria-label="Set password for {account.email}"
>
	<KeyRoundIcon />
</Button>

<Dialog bind:open title="Set password for {account.email}">
	<form
		{...form.enhance(async (f) => {
			if (await f.submit()) {
				f.element.reset();
				open = false;
			}
		})}
		class="grid gap-4"
	>
		<input {...form.fields.id.as('hidden', account.id)} />
		<Field
			label="New password"
			issues={form.fields._password.issues()}
			hint="At least 10 characters"
		>
			<Input {...form.fields._password.as('password')} autocomplete="new-password" required />
		</Field>
		<FormActions>
			<Button type="button" variant="secondary" onclick={() => (open = false)}>Cancel</Button>
			<Button type="submit" disabled={!!form.pending}>Save</Button>
		</FormActions>
	</form>
</Dialog>
