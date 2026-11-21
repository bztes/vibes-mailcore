import * as v from 'valibot';
import { invalid } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { form } from '$app/server';
import { db } from '#lib/server/db/index.js';
import { alias, mailbox } from '#lib/server/db/schema.js';
import { requireUser } from '#lib/server/auth.js';
import { domainForUser } from '#lib/server/access.js';
import { hashMailboxPassword } from '#lib/server/password.js';
import { createMailboxSchema, GB, updateMailboxSchema } from '#lib/schemas.js';

async function mailboxForUser(id: string) {
	const user = requireUser();
	const [row] = await db.select().from(mailbox).where(eq(mailbox.id, id));
	if (!row) invalid('Mailbox not found');
	await domainForUser(user, { id: row.domainId });
	return row;
}

export const createMailbox = form(
	createMailboxSchema,
	async ({ domain: name, localPart, name: displayName, _password, quotaGb }, issue) => {
		const user = requireUser();
		const d = await domainForUser(user, { name });

		const where = (t: typeof mailbox | typeof alias) =>
			and(eq(t.domainId, d.id), eq(t.localPart, localPart));
		const [[m], [a]] = await Promise.all([
			db.select({ id: mailbox.id }).from(mailbox).where(where(mailbox)),
			db.select({ id: alias.id }).from(alias).where(where(alias))
		]);
		if (m) invalid(issue.localPart('This mailbox already exists'));
		if (a) invalid(issue.localPart('An alias with this address exists'));

		await db.insert(mailbox).values({
			domainId: d.id,
			localPart,
			name: displayName,
			passwordHash: await hashMailboxPassword(_password),
			quotaBytes: quotaGb * GB
		});
		return { created: `${localPart}@${d.name}` };
	}
);

export const updateMailbox = form(
	updateMailboxSchema,
	async ({ id, name, quotaGb, active, _password }) => {
		const row = await mailboxForUser(id);
		await db
			.update(mailbox)
			.set({
				name,
				quotaBytes: quotaGb * GB,
				active,
				...(_password ? { passwordHash: await hashMailboxPassword(_password) } : {})
			})
			.where(eq(mailbox.id, row.id));
		return { saved: true };
	}
);

export const deleteMailbox = form(
	v.object({ id: v.pipe(v.string(), v.uuid()) }),
	async ({ id }) => {
		const row = await mailboxForUser(id);
		await db.delete(mailbox).where(eq(mailbox.id, row.id));
	}
);
