import { and, eq, isNull, ne } from 'drizzle-orm';
import { db } from './db';
import { domain, type Domain } from './db/schema';
import { publishDkimKey } from './dkim';

/**
 * Proof of ownership is the DKIM record: its key is generated per claim, so only someone
 * who controls the domain's DNS can publish it. Call this once the record was seen.
 *
 * The first claim to verify wins. Other (unverified) claims of the same name are removed,
 * they could never become active anyway.
 */
export async function markVerified(d: Pick<Domain, 'id' | 'name'>) {
	const row = await db
		.transaction(async (tx) => {
			const [row] = await tx
				.update(domain)
				.set({ verifiedAt: new Date() })
				.where(and(eq(domain.id, d.id), isNull(domain.verifiedAt)))
				.returning();
			if (!row) return;
			await tx
				.delete(domain)
				.where(and(eq(domain.name, d.name), ne(domain.id, d.id), isNull(domain.verifiedAt)));
			return row;
		})
		// someone else verified the same name at the same moment
		.catch((e) => {
			if ((e as { code?: string }).code === '23505') return undefined;
			throw e;
		});
	// Only now hand the key to rspamd: it is keyed by domain name, so publishing an
	// unverified claim would overwrite the real owner's signing key.
	if (row) await publishDkimKey(row);
	return !!row;
}
