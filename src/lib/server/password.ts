import { hash, verify, type Algorithm } from '@node-rs/argon2';

// OWASP recommended argon2id baseline. Dovecot verifies the same PHC string.
const options = {
	algorithm: 2 as Algorithm, // Argon2id (const enum, not importable with isolatedModules)
	memoryCost: 19456,
	timeCost: 2,
	parallelism: 1
};

/** Hash for UI accounts (plain PHC string). */
export function hashPassword(password: string) {
	return hash(password, options);
}

export function verifyPassword(phc: string, password: string) {
	return verify(phc, password).catch(() => false);
}

const DOVECOT_PREFIX = '{ARGON2ID}';

/** Hash for mailboxes, in dovecot's `{SCHEME}hash` format. */
export async function hashMailboxPassword(password: string) {
	return DOVECOT_PREFIX + (await hash(password, options));
}
