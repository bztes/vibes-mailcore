import * as v from 'valibot';
import { invalid, redirect } from '@sveltejs/kit';
import { and, count, eq, ne } from 'drizzle-orm';
import { form } from '$app/server';
import { db } from '#lib/server/db/index.js';
import { account, domain, domainManager } from '#lib/server/db/schema.js';
import { requireUser } from '#lib/server/auth.js';
import { domainForOwner, domainForUser, managedBy } from '#lib/server/access.js';
import { hashPassword } from '#lib/server/password.js';
import { addManagerSchema } from '#lib/schemas.js';

/**
 * Owners add people to their domain, as manager or owner. If no account has this email yet,
 * one is created with the given password (a regular account: it only sees its domains).
 */
export const addManager = form(
	addManagerSchema,
	async ({ domainId, email, _password, role }, issue) => {
		const user = requireUser();
		const d = await domainForOwner(user, { id: domainId });

		let [target] = await db
			.select({ id: account.id })
			.from(account)
			.where(eq(account.email, email));
		const created = !target;

		if (target) {
			const [claim] = await db
				.select({ id: domain.id })
				.from(domain)
				.where(and(eq(domain.name, d.name), managedBy(target.id)));
			if (claim?.id === d.id) invalid(issue.email('This account already manages the domain'));
			if (claim) invalid(issue.email('This account has its own unverified claim of this domain'));
		} else {
			if (!_password) {
				invalid(issue._password('No account with this email yet. Set a password to create one.'));
			}
			[target] = await db
				.insert(account)
				.values({ email, role: 'user', passwordHash: await hashPassword(_password) })
				.returning({ id: account.id });
		}

		await db.insert(domainManager).values({ domainId: d.id, accountId: target.id, role });
		return { added: email, created };
	}
);

export const removeManager = form(
	/** `id` is the account to remove */
	v.object({ id: v.pipe(v.string(), v.uuid()), domainId: v.pipe(v.string(), v.uuid()) }),
	async ({ id: accountId, domainId }) => {
		const user = requireUser();
		// anyone may leave a domain; removing others is for owners
		const d =
			accountId === user.id
				? await domainForUser(user, { id: domainId })
				: await domainForOwner(user, { id: domainId });

		const [otherOwners] = await db
			.select({ n: count() })
			.from(domainManager)
			.where(
				and(
					eq(domainManager.domainId, d.id),
					eq(domainManager.role, 'owner'),
					ne(domainManager.accountId, accountId)
				)
			);
		if (otherOwners.n === 0) invalid('A domain needs at least one owner');

		await db
			.delete(domainManager)
			.where(and(eq(domainManager.domainId, d.id), eq(domainManager.accountId, accountId)));

		// removed yourself: the domain is gone from your view
		if (accountId === user.id && user.role !== 'admin') redirect(303, '/');
	}
);
