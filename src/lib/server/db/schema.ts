import { sql } from 'drizzle-orm';
import {
	bigint,
	boolean,
	index,
	pgEnum,
	pgTable,
	pgView,
	primaryKey,
	text,
	timestamp,
	uniqueIndex,
	uuid
} from 'drizzle-orm/pg-core';

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();

// ---------------------------------------------------------------------------
// UI accounts: people who log into the admin UI. Not mail logins.
// ---------------------------------------------------------------------------

export const role = pgEnum('role', ['admin', 'user']);

export const account = pgTable('account', {
	id: uuid('id').primaryKey().defaultRandom(),
	email: text('email').notNull().unique(),
	name: text('name').notNull().default(''),
	passwordHash: text('password_hash').notNull(),
	role: role('role').notNull().default('user'),
	createdAt: createdAt()
});

export const session = pgTable(
	'session',
	{
		/** sha256 of the session token; the raw token only lives in the cookie */
		id: text('id').primaryKey(),
		accountId: uuid('account_id')
			.notNull()
			.references(() => account.id, { onDelete: 'cascade' }),
		expiresAt: timestamp('expires_at', { withTimezone: true }).notNull()
	},
	(t) => [index('session_account_idx').on(t.accountId)]
);

// ---------------------------------------------------------------------------
// Mail data
// ---------------------------------------------------------------------------

export const domain = pgTable(
	'domain',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		/**
		 * lowercase, no trailing dot. Several accounts may claim the same name, but only
		 * one claim can be verified; unverified claims never reach the mail server.
		 */
		name: text('name').notNull(),
		active: boolean('active').notNull().default(true),
		dkimSelector: text('dkim_selector').notNull(),
		dkimPrivateKey: text('dkim_private_key').notNull(),
		/** base64 SPKI, i.e. the `p=` value of the DNS record */
		dkimPublicKey: text('dkim_public_key').notNull(),
		/** set once the owner proved DNS control by publishing the DKIM key */
		verifiedAt: timestamp('verified_at', { withTimezone: true }),
		createdAt: createdAt()
	},
	(t) => [
		uniqueIndex('domain_verified_name_idx')
			.on(t.name)
			.where(sql`${t.verifiedAt} IS NOT NULL`)
	]
);

export const domainRole = pgEnum('domain_role', ['owner', 'manager']);

/**
 * Accounts that can manage a domain. Managers handle mailboxes and aliases; owners can also
 * add/remove people (incl. creating their accounts) and delete the domain. A domain always
 * keeps at least one owner (enforced by the app). An account should hold at most one claim
 * per name (also app-side).
 */
export const domainManager = pgTable(
	'domain_manager',
	{
		domainId: uuid('domain_id')
			.notNull()
			.references(() => domain.id, { onDelete: 'cascade' }),
		accountId: uuid('account_id')
			.notNull()
			.references(() => account.id, { onDelete: 'cascade' }),
		role: domainRole('role').notNull().default('manager'),
		createdAt: createdAt()
	},
	(t) => [
		primaryKey({ columns: [t.domainId, t.accountId] }),
		index('domain_manager_account_idx').on(t.accountId)
	]
);

export const mailbox = pgTable(
	'mailbox',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		domainId: uuid('domain_id')
			.notNull()
			.references(() => domain.id, { onDelete: 'cascade' }),
		/** lowercase part before the @ */
		localPart: text('local_part').notNull(),
		name: text('name').notNull().default(''),
		/** dovecot-style hash incl. scheme prefix, e.g. {ARGON2ID}$argon2id$... */
		passwordHash: text('password_hash').notNull(),
		quotaBytes: bigint('quota_bytes', { mode: 'number' }).notNull(),
		active: boolean('active').notNull().default(true),
		createdAt: createdAt()
	},
	(t) => [uniqueIndex('mailbox_address_idx').on(t.domainId, t.localPart)]
);

export const alias = pgTable(
	'alias',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		domainId: uuid('domain_id')
			.notNull()
			.references(() => domain.id, { onDelete: 'cascade' }),
		/** lowercase part before the @; empty string = catch-all */
		localPart: text('local_part').notNull(),
		/** full destination addresses, may be external */
		destinations: text('destinations').array().notNull(),
		active: boolean('active').notNull().default(true),
		createdAt: createdAt()
	},
	(t) => [uniqueIndex('alias_address_idx').on(t.domainId, t.localPart)]
);

// ---------------------------------------------------------------------------
// Views read by postfix + dovecot (role `mailserver`, SELECT only).
// These are the stable contract between the app and the mail daemons.
// ---------------------------------------------------------------------------

/** postfix: virtual_mailbox_domains */
export const mailDomains = pgView('mail_domains', {
	domain: text('domain').notNull()
}).as(sql`SELECT name AS domain FROM domain WHERE active AND verified_at IS NOT NULL`);

/** postfix: virtual_mailbox_maps · dovecot: passdb + userdb */
export const mailUsers = pgView('mail_users', {
	address: text('address').notNull(),
	domain: text('domain').notNull(),
	localPart: text('local_part').notNull(),
	password: text('password').notNull(),
	quotaBytes: bigint('quota_bytes', { mode: 'number' }).notNull()
}).as(sql`
	SELECT m.local_part || '@' || d.name AS address,
	       d.name AS domain,
	       m.local_part,
	       m.password_hash AS password,
	       m.quota_bytes
	FROM mailbox m
	JOIN domain d ON d.id = m.domain_id
	WHERE m.active AND d.active AND d.verified_at IS NOT NULL
`);

/**
 * postfix: virtual_alias_maps.
 * Every mailbox maps to itself so that a catch-all (`@domain`) never swallows
 * mail for real mailboxes.
 */
export const mailAliases = pgView('mail_aliases', {
	address: text('address').notNull(),
	destinations: text('destinations').notNull()
}).as(sql`
	SELECT a.local_part || '@' || d.name AS address,
	       array_to_string(a.destinations, ',') AS destinations
	FROM alias a
	JOIN domain d ON d.id = a.domain_id
	WHERE a.active AND d.active AND d.verified_at IS NOT NULL
	UNION ALL
	SELECT m.local_part || '@' || d.name, m.local_part || '@' || d.name
	FROM mailbox m
	JOIN domain d ON d.id = m.domain_id
	WHERE m.active AND d.active AND d.verified_at IS NOT NULL
`);

/**
 * postfix: smtpd_sender_login_maps.
 * A mailbox may send as itself and as every alias that delivers to it.
 */
export const mailSenderLogins = pgView('mail_sender_logins', {
	address: text('address').notNull(),
	logins: text('logins').notNull()
}).as(sql`
	SELECT address, string_agg(login, ',') AS logins
	FROM (
		SELECT m.local_part || '@' || d.name AS address, m.local_part || '@' || d.name AS login
		FROM mailbox m
		JOIN domain d ON d.id = m.domain_id
		WHERE m.active AND d.active AND d.verified_at IS NOT NULL
		UNION
		SELECT a.local_part || '@' || d.name, lower(dest)
		FROM alias a
		JOIN domain d ON d.id = a.domain_id
		CROSS JOIN LATERAL unnest(a.destinations) AS dest
		WHERE a.active AND d.active AND d.verified_at IS NOT NULL
	) s
	GROUP BY address
`);

export type Account = typeof account.$inferSelect;
export type Domain = typeof domain.$inferSelect;
export type Mailbox = typeof mailbox.$inferSelect;
export type Alias = typeof alias.$inferSelect;
