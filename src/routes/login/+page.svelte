<script lang="ts">
	import { login, needsSetup, setup } from '#lib/remote/auth.remote.js';
	import { Alert, Button, Field, Input } from '#lib/components/ui/index.js';

	const signUp = $derived(await needsSetup());
	const form = $derived(signUp ? setup : login);
</script>

<svelte:head><title>{signUp ? 'Set up' : 'Sign in'} · Mailcore</title></svelte:head>

<main class="grid min-h-dvh place-items-center px-4">
	<div class="w-full max-w-sm">
		<div class="mb-8 text-center">
			<div class="mx-auto mb-4 grid size-10 place-items-center rounded-xl bg-zinc-900 text-white">
				<svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="2">
					<path
						d="m3 7 9 6 9-6M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z"
					/>
				</svg>
			</div>
			<h1 class="text-xl font-semibold">{signUp ? 'Set up Mailcore' : 'Sign in to Mailcore'}</h1>
			{#if signUp}
				<p class="mt-2 text-sm text-zinc-500">
					Create the admin account. Sign-up closes after this.
				</p>
			{/if}
		</div>

		<form {...form} class="grid gap-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-xs">
			{#each form.fields.allIssues()?.filter((i) => !i.path.length) ?? [] as issue (issue.message)}
				<Alert tone="error">{issue.message}</Alert>
			{/each}
			{#if signUp}
				<Field label="Name" issues={setup.fields.name.issues()}>
					<Input {...setup.fields.name.as('text')} autocomplete="name" />
				</Field>
			{/if}
			<Field label="Email" issues={form.fields.email.issues()}>
				<Input {...form.fields.email.as('email')} autocomplete="username" required />
			</Field>
			<Field label="Password" issues={form.fields._password.issues()}>
				<Input
					{...form.fields._password.as('password')}
					autocomplete={signUp ? 'new-password' : 'current-password'}
					minlength={signUp ? 10 : undefined}
					required
				/>
			</Field>
			<Button type="submit" class="mt-1 w-full" disabled={!!form.pending}>
				{signUp ? 'Create admin account' : 'Sign in'}
			</Button>
		</form>
	</div>
</main>
