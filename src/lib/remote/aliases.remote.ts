import * as v from 'valibot';
import { invalid } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { form } from '$app/server';
import { db } from '#lib/server/db/index.js';
import { alias, mailbox } from '#lib/server/db/schema.js';
import { requireUser } from '#lib/server/auth.js';
import { domainForUser } from '#lib/server/access.js';
import { createAliasSchema, updateAliasSchema } from '#lib/schemas.js';

async function aliasForUser(id: string) {
	const user = requireUser();
	const [row] = await db.select().from(alias).where(eq(alias.id, id));
	if (!row) invalid('Alias not found');
	await domainForUser(user, { id: row.domainId });
	return row;
}

export const createAlias = form(
	createAliasSchema,
	async ({ domain: name, catchAll, localPart, destinations }, issue) => {
		const user = requireUser();
		const d = await domainForUser(user, { name });
		const part = catchAll ? '' : localPart;
		if (!catchAll && !part) invalid(issue.localPart('Enter an address'));

		const [[a], [m]] = await Promise.all([
			db
				.select({ id: alias.id })
				.from(alias)
				.where(and(eq(alias.domainId, d.id), eq(alias.localPart, part))),
			db
				.select({ id: mailbox.id })
				.from(mailbox)
				.where(and(eq(mailbox.domainId, d.id), eq(mailbox.localPart, part)))
		]);
		if (a)
			invalid(
				catchAll
					? 'This domain already has a catch-all'
					: issue.localPart('This alias already exists')
			);
		if (m) invalid(issue.localPart('A mailbox with this address exists'));

		await db.insert(alias).values({ domainId: d.id, localPart: part, destinations });
		return { created: true };
	}
);

export const updateAlias = form(updateAliasSchema, async ({ id, destinations, active }) => {
	const row = await aliasForUser(id);
	await db.update(alias).set({ destinations, active }).where(eq(alias.id, row.id));
	return { saved: true };
});

export const deleteAlias = form(v.object({ id: v.pipe(v.string(), v.uuid()) }), async ({ id }) => {
	const row = await aliasForUser(id);
	await db.delete(alias).where(eq(alias.id, row.id));
});
