<script lang="ts">
	import type { Component } from 'svelte';
	import type { RemoteForm } from '$app/server';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import Button from './Button.svelte';
	import Dialog from './Dialog.svelte';
	import Alert from './Alert.svelte';
	import FormActions from './FormActions.svelte';

	let {
		form,
		id,
		title,
		message,
		label,
		confirmLabel = 'Delete',
		icon: Icon = Trash2Icon,
		hidden = {}
	}: {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		form: Omit<RemoteForm<{ id: string }, any>, 'for'>;
		id: string;
		title: string;
		message: string;
		/** text on the trigger button; icon-only when omitted */
		label?: string;
		/** text on the confirm button */
		confirmLabel?: string;
		/** trigger icon */
		icon?: Component;
		/** extra fields the form needs besides `id` */
		hidden?: Record<string, string>;
	} = $props();

	let open = $state(false);
</script>

{#if label}
	<Button variant="secondary" onclick={() => (open = true)}>
		<Icon />
		{label}
	</Button>
{:else}
	<Button variant="ghost" size="icon" onclick={() => (open = true)} aria-label={title} {title}>
		<Icon />
	</Button>
{/if}

<Dialog bind:open {title}>
	<form
		{...form.enhance(async (f) => {
			if (await f.submit()) open = false;
		})}
		class="grid gap-4"
	>
		<input {...form.fields.id.as('hidden', id)} />
		{#each Object.entries(hidden) as [name, value] (name)}
			<input type="hidden" {name} {value} />
		{/each}
		<p class="text-sm text-zinc-600">{message}</p>
		{#each form.fields.allIssues() ?? [] as issue (issue.message)}
			<Alert tone="error">{issue.message}</Alert>
		{/each}
		<FormActions>
			<Button type="button" variant="secondary" onclick={() => (open = false)}>Cancel</Button>
			<Button type="submit" variant="danger" disabled={!!form.pending}>{confirmLabel}</Button>
		</FormActions>
	</form>
</Dialog>
