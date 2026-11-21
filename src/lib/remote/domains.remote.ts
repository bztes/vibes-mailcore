import * as v from 'valibot';
import { invalid, redirect } from '@sveltejs/kit';
import { and, asc, count, eq, isNotNull, or, sql } from 'drizzle-orm';
import { form, query } from '$app/server';
import { APP_DEFAULT_MAILBOX_GB, MAILCORE_HOSTNAME } from '$app/env/private';
import { db } from '#lib/server/db/index.js';
import { account, alias, domain, domainManager, mailbox } from '#lib/server/db/schema.js';
import { requireUser } from '#lib/server/auth.js';
import { domainForOwner, domainForUser, isDomainOwner, managedBy } from '#lib/server/access.js';
import { generateDkimKey, unpublishDkimKey } from '#lib/server/dkim.js';
import { checkDns } from '#lib/server/dns.js';
import { markVerified } from '#lib/server/verify.js';
import { storageUsage } from '#lib/server/doveadm.js';
import { createDomainSchema, domainName } from '#lib/schemas.js';

export const listDomains = query(async () => {
	const user = requireUser();

	const mailboxes = db
		.select({ domainId: mailbox.domainId, n: count().as('mailbox_count') })
		.from(mailbox)
		.groupBy(mailbox.domainId)
		.as('mb');
	const aliases = db
		.select({ domainId: alias.domainId, n: count().as('alias_count') })
		.from(alias)
		.groupBy(alias.domainId)
		.as('al');
	const managers = db
		.select({
			domainId: domainManager.domainId,
			emails: sql<string[]>`array_agg(${account.email} ORDER BY ${account.email})`.as('emails')
		})
		.from(domainManager)
		.innerJoin(account, eq(account.id, domainManager.accountId))
		.groupBy(domainManager.domainId)
		.as('mg');

	const rows = await db
		.select({
			id: domain.id,
			name: domain.name,
			active: domain.active,
			verified: sql<boolean>`${domain.verifiedAt} IS NOT NULL`,
			managers: managers.emails,
			mailboxes: mailboxes.n,
			aliases: aliases.n
		})
		.from(domain)
		.leftJoin(managers, eq(managers.domainId, domain.id))
		.leftJoin(mailboxes, eq(mailboxes.domainId, domain.id))
		.leftJoin(aliases, eq(aliases.domainId, domain.id))
		.where(user.role === 'admin' ? undefined : managedBy(user.id))
		.orderBy(asc(domain.name));

	return rows.map((r) => ({
		...r,
		managers: r.managers ?? [],
		mailboxes: r.mailboxes ?? 0,
		aliases: r.aliases ?? 0
	}));
});

export const getDomain = query(domainName, async (name) => {
	const user = requireUser();
	const d = await domainForUser(user, { name });

	const [mailboxes, aliases, managers, usage] = await Promise.all([
		db.select().from(mailbox).where(eq(mailbox.domainId, d.id)).orderBy(asc(mailbox.localPart)),
		db.select().from(alias).where(eq(alias.domainId, d.id)).orderBy(asc(alias.localPart)),
		db
			.select({
				id: account.id,
				email: account.email,
				name: account.name,
				role: domainManager.role
			})
			.from(domainManager)
			.innerJoin(account, eq(account.id, domainManager.accountId))
			.where(eq(domainManager.domainId, d.id))
			.orderBy(asc(domainManager.role), asc(account.email)),
		storageUsage(d.name)
	]);
	const canManagePeople = await isDomainOwner(user, d.id);

	return {
		id: d.id,
		name: d.name,
		active: d.active,
		verified: !!d.verifiedAt,
		mailHostname: MAILCORE_HOSTNAME!,
		/** pre-filled size limit for new mailboxes */
		defaultQuotaGb: APP_DEFAULT_MAILBOX_GB,
		managers,
		/** owners (and admins) may add/remove people and delete the domain */
		canManagePeople,
		mailboxes: mailboxes.map((m) => ({
			id: m.id,
			address: `${m.localPart}@${d.name}`,
			localPart: m.localPart,
			name: m.name,
			quotaBytes: m.quotaBytes,
			usedBytes: usage[`${m.localPart}@${d.name}`],
			active: m.active
		})),
		aliases: aliases.map((a) => ({
			id: a.id,
			address: a.localPart ? `${a.localPart}@${d.name}` : `*@${d.name}`,
			catchAll: a.localPart === '',
			destinations: a.destinations,
			active: a.active
		}))
	};
});

/**
 * Separate from getDomain because DNS lookups can be slow.
 * Also verifies the domain as soon as our DKIM key shows up in its DNS.
 */
export const getDomainDns = query(domainName, async (name) => {
	const user = requireUser();
	const d = await domainForUser(user, { name });
	const records = await checkDns(d);

	let verified = !!d.verifiedAt;
	if (!verified && records.find((r) => r.key === 'dkim')?.status === 'ok') {
		verified = await markVerified(d);
	}
	return { verified, records };
});

/** Accounts a domain can be assigned to (admins only, for the "create domain" form). */
export const listOwners = query(async () => {
	const user = requireUser();
	if (user.role !== 'admin') return [];
	return db
		.select({ id: account.id, email: account.email })
		.from(account)
		.orderBy(asc(account.email));
});

export const createDomain = form(createDomainSchema, async ({ name, ownerId }, issue) => {
	const user = requireUser();
	const owner = user.role === 'admin' && ownerId ? ownerId : user.id;

	// Anyone may claim a name until someone proves ownership via DNS (see markVerified).
	const [taken] = await db
		.select({ mine: managedBy(owner).mapWith(Boolean) })
		.from(domain)
		.where(and(eq(domain.name, name), or(isNotNull(domain.verifiedAt), managedBy(owner))))
		.orderBy(sql`NOT ${managedBy(owner)}`)
		.limit(1);
	if (taken) {
		invalid(
			issue.name(
				taken.mine
					? 'This domain was already added'
					: 'This domain is already in use by another account'
			)
		);
	}

	const key = generateDkimKey();
	const row = await db.transaction(async (tx) => {
		const [row] = await tx
			.insert(domain)
			.values({
				name,
				dkimSelector: key.selector,
				dkimPrivateKey: key.privateKey,
				dkimPublicKey: key.publicKey
			})
			.returning();
		await tx.insert(domainManager).values({ domainId: row.id, accountId: owner, role: 'owner' });
		return row;
	});

	redirect(303, `/domains/${row.name}`);
});

export const deleteDomain = form(v.object({ id: v.pipe(v.string(), v.uuid()) }), async ({ id }) => {
	const user = requireUser();
	const d = await domainForOwner(user, { id });
	await db.delete(domain).where(eq(domain.id, d.id));
	// unverified claims never had their key published, and the name may belong to someone else
	if (d.verifiedAt) await unpublishDkimKey(d).catch(() => {});
	redirect(303, '/');
});
