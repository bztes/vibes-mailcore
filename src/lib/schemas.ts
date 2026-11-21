// Shared validation schemas (used by remote functions and for client-side preflight).
import * as v from 'valibot';

const text = () => v.pipe(v.string(), v.trim());

export const domainName = v.pipe(
	text(),
	v.toLowerCase(),
	v.regex(
		/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/,
		'Enter a domain like example.com'
	)
);

/** part before the @ — no "+" because that's used for plus-addressing (me+shop@…) */
export const localPart = v.pipe(
	text(),
	v.toLowerCase(),
	v.regex(
		/^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$/,
		'Use letters, numbers, dots, dashes or underscores'
	)
);

export const email = v.pipe(text(), v.toLowerCase(), v.email('Enter a valid email address'));

export const password = v.pipe(v.string(), v.minLength(10, 'At least 10 characters'));

export const quotaGb = v.pipe(
	v.number('Enter a number'),
	v.integer('Whole gigabytes only'),
	v.minValue(1, 'At least 1 GB'),
	v.maxValue(2000, 'At most 2000 GB')
);

export const createDomainSchema = v.object({
	name: domainName,
	/** admins may create domains for another account */
	ownerId: v.optional(v.string())
});

export const createMailboxSchema = v.object({
	domain: domainName,
	localPart,
	name: v.optional(text(), ''),
	_password: password,
	quotaGb
});

export const updateMailboxSchema = v.object({
	id: v.pipe(v.string(), v.uuid()),
	name: v.optional(text(), ''),
	quotaGb,
	active: v.optional(v.boolean(), false),
	/** empty = keep the current password */
	_password: v.optional(v.union([v.literal(''), password]), ''),
	/** owners can also add/remove people and delete the domain */
	role: v.optional(v.picklist(['manager', 'owner']), 'manager')
});

/** Destinations as typed in a textarea: commas, spaces or newlines. */
export const destinationList = v.pipe(
	v.string(),
	v.transform((s) =>
		s
			.split(/[\s,;]+/)
			.map((d) => d.trim().toLowerCase())
			.filter(Boolean)
	),
	v.minLength(1, 'Add at least one destination'),
	v.maxLength(50, 'At most 50 destinations'),
	v.array(v.pipe(v.string(), v.email('Not a valid address')))
);

export const createAliasSchema = v.object({
	domain: domainName,
	catchAll: v.optional(v.boolean(), false),
	localPart: v.optional(v.union([v.literal(''), localPart]), ''),
	destinations: destinationList
});

export const updateAliasSchema = v.object({
	id: v.pipe(v.string(), v.uuid()),
	destinations: destinationList,
	active: v.optional(v.boolean(), false)
});

export const createAccountSchema = v.object({
	email,
	name: v.optional(text(), ''),
	_password: password,
	admin: v.optional(v.boolean(), false)
});

export const changePasswordSchema = v.object({
	_current: v.string(),
	_password: password
});

export const GB = 1024 ** 3;

export const addManagerSchema = v.object({
	domainId: v.pipe(v.string(), v.uuid()),
	email,
	/** only used when no account with this email exists yet; empty = must already exist */
	_password: v.optional(v.union([v.literal(''), password]), ''),
	/** owners can also add/remove people and delete the domain */
	role: v.optional(v.picklist(['manager', 'owner']), 'manager')
});
