<script lang="ts">
	import KeyRoundIcon from '@lucide/svelte/icons/key-round';
	import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';
	import ShieldOffIcon from '@lucide/svelte/icons/shield-off';
	import {
		enableTotp,
		getMfaStatus,
		newRecoveryCodes,
		startTotp,
		turnOffTotp
	} from '#lib/remote/mfa.remote.js';
	import {
		Alert,
		Badge,
		Button,
		Card,
		CopyButton,
		Dialog,
		Field,
		FormActions,
		Input
	} from '#lib/components/ui/index.js';

	const status = $derived(await getMfaStatus());

	let setup = $state<{ secret: string; qr: string } | null>(null);
	let starting = $state(false);
	let startError = $state<string | null>(null);
	/** shown once after enabling or regenerating */
	let codes = $state<string[] | null>(null);
	let notice = $state<string | null>(null);
	let passwordFor = $state<'off' | 'codes' | null>(null);
	let passwordOpen = $state(false);

	async function begin() {
		starting = true;
		startError = null;
		notice = null;
		try {
			setup = await startTotp();
		} catch (e) {
			startError = (e as { body?: { message?: string } }).body?.message ?? 'Could not start setup';
		} finally {
			starting = false;
		}
	}

	function askPassword(kind: 'off' | 'codes') {
		passwordFor = kind;
		passwordOpen = true;
	}

	const modes = {
		off: {
			form: turnOffTotp,
			title: 'Turn off two-factor auth?',
			description: 'Signing in will only need your password again.',
			variant: 'danger',
			label: 'Turn off'
		},
		codes: {
			form: newRecoveryCodes,
			title: 'New recovery codes',
			description: 'Your old recovery codes stop working.',
			variant: 'primary',
			label: 'Create new codes'
		}
	} as const;
	const mode = $derived(modes[passwordFor ?? 'codes']);
</script>

<Card
	title="Two-factor authentication"
	description="Ask for a code from an authenticator app after the password."
>
	{#snippet actions()}
		{#if status.totp}
			<Badge tone="ok"><ShieldCheckIcon />On</Badge>
		{:else}
			<Badge>Off</Badge>
		{/if}
	{/snippet}

	{#if codes}
		<div class="grid gap-4">
			<p class="text-sm text-zinc-700">
				Save these recovery codes somewhere safe (for example in your password manager). Each one
				lets you sign in once if you lose your phone. <strong>They are shown only now.</strong>
			</p>
			<div class="flex items-start gap-2 rounded-lg bg-zinc-50 p-4">
				<ul class="grid flex-1 grid-cols-2 gap-x-6 gap-y-1 font-mono text-sm">
					{#each codes as code (code)}<li>{code}</li>{/each}
				</ul>
				<CopyButton value={codes.join('\n')} label="Copy recovery codes" />
			</div>
			<FormActions>
				<Button onclick={() => (codes = null)}>I saved them</Button>
			</FormActions>
		</div>
	{:else if status.totp}
		<div class="flex flex-wrap items-center justify-between gap-3">
			<p class="text-sm text-zinc-500">{status.recoveryCodes} recovery codes left.</p>
			<div class="flex gap-2">
				<Button size="sm" variant="secondary" onclick={() => askPassword('codes')}>
					<KeyRoundIcon /> New recovery codes
				</Button>
				<Button size="sm" variant="ghost" onclick={() => askPassword('off')}>
					<ShieldOffIcon /> Turn off
				</Button>
			</div>
		</div>
	{:else if setup}
		<div class="grid gap-5 sm:grid-cols-[10rem_1fr]">
			<div class="rounded-lg bg-white p-2 ring-1 ring-zinc-200 [&_svg]:h-auto [&_svg]:w-full">
				<!-- server-generated svg from our own otpauth uri -->
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				{@html setup.qr}
			</div>
			<div class="grid content-start gap-3 text-sm text-zinc-700">
				<p>
					Scan the QR code with an authenticator app (Aegis, 2FAS, Google Authenticator, 1Password,
					Bitwarden, …). Can't scan it? Enter this key instead:
				</p>
				<div class="flex items-center gap-1">
					<code class="font-mono text-xs break-all select-all">{setup.secret}</code>
					<CopyButton value={setup.secret} label="Copy key" />
				</div>
				<form
					{...enableTotp.enhance(async ({ element, submit }) => {
						if (await submit()) {
							element.reset();
							const result = enableTotp.result?.recoveryCodes;
							if (result) {
								codes = result;
								setup = null;
							}
						}
					})}
					class="grid gap-3"
				>
					<Field label="Code from the app" issues={enableTotp.fields._code.issues()}>
						<Input
							{...enableTotp.fields._code.as('text')}
							inputmode="numeric"
							autocomplete="one-time-code"
							placeholder="123456"
							class="font-mono tracking-widest"
							required
						/>
					</Field>
					<FormActions>
						<Button type="button" variant="secondary" onclick={() => (setup = null)}>Cancel</Button>
						<Button type="submit" disabled={!!enableTotp.pending}>
							<ShieldCheckIcon /> Turn on
						</Button>
					</FormActions>
				</form>
			</div>
		</div>
	{:else}
		<div class="grid gap-4">
			{#if notice}<Alert tone="success">{notice}</Alert>{/if}
			{#if startError}<Alert tone="error">{startError}</Alert>{/if}
			<FormActions>
				<Button disabled={starting} onclick={begin}><ShieldCheckIcon /> Set up</Button>
			</FormActions>
		</div>
	{/if}
</Card>

<Dialog bind:open={passwordOpen} title={mode.title} description={mode.description}>
	{#key passwordFor}
		<form
			{...mode.form.enhance(async ({ element, submit }) => {
				if (await submit()) {
					element.reset();
					passwordOpen = false;
					if (passwordFor === 'off') notice = 'Two-factor authentication is off.';
					else codes = newRecoveryCodes.result?.recoveryCodes ?? null;
				}
			})}
			class="grid gap-4"
		>
			<Field label="Your password" issues={mode.form.fields._password.issues()}>
				<Input
					{...mode.form.fields._password.as('password')}
					autocomplete="current-password"
					required
				/>
			</Field>
			<FormActions>
				<Button type="button" variant="secondary" onclick={() => (passwordOpen = false)}>
					Cancel
				</Button>
				<Button type="submit" variant={mode.variant} disabled={!!mode.form.pending}>
					{mode.label}
				</Button>
			</FormActions>
		</form>
	{/key}
</Dialog>
