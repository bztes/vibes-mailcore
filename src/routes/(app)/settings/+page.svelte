<script lang="ts">
	import { changePassword, getMe } from '#lib/remote/auth.remote.js';
	import { Alert, Button, Card, Field, FormActions, Input } from '#lib/components/ui/index.js';

	const me = $derived(await getMe());
	const { _current, _password } = changePassword.fields;
</script>

<svelte:head><title>Settings · Mailcore</title></svelte:head>

<h1 class="mb-6 text-2xl font-semibold tracking-tight">Settings</h1>

<div class="max-w-lg">
	<Card title="Your password" description="For signing in to Mailcore as {me.email}.">
		<form
			{...changePassword.enhance(async (f) => {
				if (await f.submit()) f.element.reset();
			})}
			class="grid gap-4"
		>
			{#if changePassword.result?.saved}
				<Alert tone="success">Password changed.</Alert>
			{/if}
			<Field label="Current password" issues={_current.issues()}>
				<Input {..._current.as('password')} autocomplete="current-password" required />
			</Field>
			<Field label="New password" issues={_password.issues()} hint="At least 10 characters">
				<Input {..._password.as('password')} autocomplete="new-password" required />
			</Field>
			<FormActions>
				<Button type="submit" disabled={!!changePassword.pending}>Change password</Button>
			</FormActions>
		</form>
	</Card>
</div>
