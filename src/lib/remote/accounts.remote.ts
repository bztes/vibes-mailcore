import * as v from 'valibot';
import { invalid } from '@sveltejs/kit';
import { and, asc, count, eq, sql } from 'drizzle-orm';
import { form, query } from '$app/server';
import { db } from '#lib/server/db/index.js';
import { account, domainManager } from '#lib/server/db/schema.js';
import { requireAdmin } from '#lib/server/auth.js';
import { hashPassword } from '#lib/server/password.js';
import { createAccountSchema, password } from '#lib/schemas.js';

export const listAccounts = query(async () => {
	requireAdmin();
	const domains = db
		.select({ accountId: domainManager.accountId, n: count().as('domain_count') })
		.from(domainManager)
		.groupBy(domainManager.accountId)
		.as('d');
	const rows = await db
		.select({
			id: account.id,
			email: account.email,
			name: account.name,
			role: account.role,
			createdAt: account.createdAt,
			domains: domains.n
		})
		.from(account)
		.leftJoin(domains, eq(domains.accountId, account.id))
		.orderBy(asc(account.email));
	return rows.map((r) => ({ ...r, domains: r.domains ?? 0 }));
});

export const createAccount = form(
	createAccountSchema,
	async ({ email, name, _password, admin }, issue) => {
		requireAdmin();
		const [exists] = await db
			.select({ id: account.id })
			.from(account)
			.where(eq(account.email, email));
		if (exists) invalid(issue.email('An account with this email exists'));
		await db.insert(account).values({
			email,
			name,
			role: admin ? 'admin' : 'user',
			passwordHash: await hashPassword(_password)
		});
		return { created: email };
	}
);

export const resetAccountPassword = form(
	v.object({ id: v.pipe(v.string(), v.uuid()), _password: password }),
	async ({ id, _password }) => {
		requireAdmin();
		await db
			.update(account)
			.set({ passwordHash: await hashPassword(_password) })
			.where(eq(account.id, id));
		return { saved: true };
	}
);

export const deleteAccount = form(
	v.object({ id: v.pipe(v.string(), v.uuid()) }),
	async ({ id }) => {
		const me = requireAdmin();
		if (id === me.id) invalid('You cannot delete your own account');
		// domains this account is the only owner of would be left without one
		const [sole] = await db
			.select({ n: count() })
			.from(domainManager)
			.where(
				and(
					eq(domainManager.accountId, id),
					eq(domainManager.role, 'owner'),
					sql`NOT EXISTS (SELECT 1 FROM domain_manager o WHERE o.domain_id = ${domainManager.domainId} AND o.role = 'owner' AND o.account_id <> ${id})`
				)
			);
		if (sole.n > 0) {
			invalid(
				'This account is the only owner of some domains. Delete them or add another owner first.'
			);
		}
		await db.delete(account).where(eq(account.id, id));
	}
);
