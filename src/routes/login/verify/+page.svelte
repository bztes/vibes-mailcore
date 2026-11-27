<script lang="ts">
	import { logout, verifyLogin } from '#lib/remote/auth.remote.js';
	import { Alert, Button, Field, Input } from '#lib/components/ui/index.js';

	let recovery = $state(false);
</script>

<svelte:head><title>Two-factor authentication · Mailcore</title></svelte:head>

<div class="mb-8 text-center">
	<h1 class="text-xl font-semibold">Two-factor authentication</h1>
	<p class="mt-2 text-sm text-zinc-500">
		{#if recovery}
			Enter one of your recovery codes. Each code works only once.
		{:else}
			Enter the 6-digit code from your authenticator app.
		{/if}
	</p>
</div>

<form {...verifyLogin} class="grid gap-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-xs">
	{#each verifyLogin.fields.allIssues() ?? [] as issue (issue.message)}
		<Alert tone="error">{issue.message}</Alert>
	{/each}
	{#key recovery}
		<Field label={recovery ? 'Recovery code' : 'Code'}>
			<Input
				{...verifyLogin.fields._code.as('text')}
				autocomplete="one-time-code"
				inputmode={recovery ? 'text' : 'numeric'}
				placeholder={recovery ? 'xxxxx-xxxxx' : '123456'}
				class="font-mono tracking-widest"
				required
				autofocus
			/>
		</Field>
	{/key}
	<Button type="submit" class="mt-1 w-full" disabled={!!verifyLogin.pending}>Verify</Button>
</form>

<div class="mt-4 flex items-center justify-between text-sm">
	<button
		type="button"
		class="text-zinc-500 hover:text-zinc-900"
		onclick={() => (recovery = !recovery)}
	>
		{recovery ? 'Use authenticator app' : 'Use a recovery code'}
	</button>
	<form {...logout}>
		<button type="submit" class="text-zinc-500 hover:text-zinc-900">Cancel</button>
	</form>
</div>
