<script lang="ts">
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import { updateAlias } from '#lib/remote/aliases.remote.js';
	import {
		Button,
		Checkbox,
		Dialog,
		Field,
		FormActions,
		Textarea
	} from '#lib/components/ui/index.js';
	import type { AliasRow } from './types';

	let { alias }: { alias: AliasRow } = $props();

	let open = $state(false);
	const form = $derived(updateAlias.for(alias.id));
</script>

<Button
	variant="ghost"
	size="icon"
	onclick={() => (open = true)}
	title="Edit"
	aria-label="Edit {alias.address}"
>
	<PencilIcon />
</Button>

<Dialog bind:open title="Edit {alias.address}">
	<form
		{...form.enhance(async (f) => {
			if (await f.submit()) open = false;
		})}
		class="grid gap-4"
	>
		<input {...form.fields.id.as('hidden', alias.id)} />
		<Field
			label="Forward to"
			hint="One address per line."
			issues={form.fields.destinations.issues()}
		>
			<Textarea
				{...form.fields.destinations.as('text', alias.destinations.join('\n'))}
				rows={4}
				required
			/>
		</Field>
		<Checkbox {...form.fields.active.as('checkbox', alias.active)} label="Active" />
		<FormActions>
			<Button type="button" variant="secondary" onclick={() => (open = false)}>Cancel</Button>
			<Button type="submit" disabled={!!form.pending}>Save</Button>
		</FormActions>
	</form>
</Dialog>
