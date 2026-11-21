import { error } from '@sveltejs/kit';
import { and, eq, exists, sql } from 'drizzle-orm';
import { db } from './db';
import { domain, domainManager } from './db/schema';
import type { SessionUser } from './auth';

/** SQL condition: `accountId` manages the domain row in the outer query. */
export const managedBy = (accountId: string) =>
	exists(
		db
			.select({ one: sql`1` })
			.from(domainManager)
			.where(and(eq(domainManager.domainId, domain.id), eq(domainManager.accountId, accountId)))
	);

/**
 * Load a domain by name or id, 404 unless the user manages it (admins see everything).
 * A name can be claimed by several accounts (only one verified), so by name a user only
 * ever sees a claim they manage; admins get the verified one, else their own, else any.
 */
export async function domainForUser(user: SessionUser, by: { name: string } | { id: string }) {
	const [row] = await db
		.select()
		.from(domain)
		.where(
			and(
				'name' in by ? eq(domain.name, by.name) : eq(domain.id, by.id),
				user.role === 'admin' ? undefined : managedBy(user.id)
			)
		)
		.orderBy(sql`${domain.verifiedAt} IS NULL`, sql`NOT ${managedBy(user.id)}`)
		.limit(1);
	if (!row) error(404, 'Domain not found');
	return row;
}

/** True if the user may add/remove people and delete the domain: its owners, and admins. */
export async function isDomainOwner(user: SessionUser, domainId: string) {
	if (user.role === 'admin') return true;
	const [row] = await db
		.select({ role: domainManager.role })
		.from(domainManager)
		.where(and(eq(domainManager.domainId, domainId), eq(domainManager.accountId, user.id)));
	return row?.role === 'owner';
}

/** Like domainForUser, but 403 unless the user is an owner of the domain. */
export async function domainForOwner(user: SessionUser, by: { id: string }) {
	const d = await domainForUser(user, by);
	if (!(await isDomainOwner(user, d.id))) error(403, 'Only owners of this domain can do this');
	return d;
}
