<script lang="ts">
	import { Card, CopyButton } from '#lib/components/ui/index.js';

	let { mailHostname }: { mailHostname: string } = $props();

	const rows = $derived([
		{ label: 'Incoming (IMAP)', host: mailHostname, port: '993', security: 'SSL/TLS' },
		{ label: 'Outgoing (SMTP)', host: mailHostname, port: '465', security: 'SSL/TLS' }
	]);
</script>

<Card
	title="Mail app settings"
	description="Use these in Thunderbird, Apple Mail, your phone, etc."
>
	<div class="grid gap-4 sm:grid-cols-2">
		{#each rows as row (row.label)}
			<div class="rounded-lg bg-zinc-50 p-4">
				<p class="mb-2 text-sm font-medium">{row.label}</p>
				<dl class="grid grid-cols-[5.5rem_1fr] gap-y-1 text-sm">
					<dt class="text-zinc-500">Server</dt>
					<dd class="flex items-center gap-1 font-mono">
						{row.host}<CopyButton value={row.host} />
					</dd>
					<dt class="text-zinc-500">Port</dt>
					<dd class="font-mono">{row.port}</dd>
					<dt class="text-zinc-500">Security</dt>
					<dd>{row.security}</dd>
					<dt class="text-zinc-500">Username</dt>
					<dd>Full email address</dd>
				</dl>
			</div>
		{/each}
	</div>
	<p class="mt-3 text-xs text-zinc-500">
		Port 587 with STARTTLS works too, if your app doesn't offer SSL/TLS on 465.
	</p>
</Card>
