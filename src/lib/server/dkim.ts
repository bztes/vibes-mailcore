import { generateKeyPairSync } from 'node:crypto';
import { createClient } from 'redis';
import { APP_REDIS_URL } from '$app/env/private';
import { isNotNull } from 'drizzle-orm';
import { db } from './db';
import { domain } from './db/schema';

/**
 * rspamd's dkim_signing module (use_redis = true) looks up
 *   HGET DKIM_SELECTOR <domain>             -> selector
 *   HGET DKIM_PRIVKEY  <selector>.<domain>  -> PEM private key
 * See docker/rspamd/local.d/dkim_signing.conf.
 */
const SELECTOR_HASH = 'DKIM_SELECTOR';
const KEY_HASH = 'DKIM_PRIVKEY';

export function generateDkimKey() {
	const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
	const now = new Date();
	return {
		selector: `mc${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}`,
		privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
		publicKey: publicKey.export({ type: 'spki', format: 'der' }).toString('base64')
	};
}

let client: ReturnType<typeof createClient> | undefined;

async function redis() {
	if (!client) {
		client = createClient({ url: APP_REDIS_URL });
		client.on('error', (e: Error) => console.error('[redis]', e.message));
		await client.connect();
	}
	return client;
}

type DkimRow = { name: string; dkimSelector: string; dkimPrivateKey: string };

export async function publishDkimKey(d: DkimRow) {
	const r = await redis();
	await r
		.multi()
		.hSet(SELECTOR_HASH, d.name, d.dkimSelector)
		.hSet(KEY_HASH, `${d.dkimSelector}.${d.name}`, d.dkimPrivateKey)
		.exec();
}

export async function unpublishDkimKey(d: Omit<DkimRow, 'dkimPrivateKey'>) {
	const r = await redis();
	await r.multi().hDel(SELECTOR_HASH, d.name).hDel(KEY_HASH, `${d.dkimSelector}.${d.name}`).exec();
}

/** Postgres is the source of truth; push every verified domain's key to redis on startup. */
export async function syncDkimKeys() {
	const rows = await db
		.select({
			name: domain.name,
			dkimSelector: domain.dkimSelector,
			dkimPrivateKey: domain.dkimPrivateKey
		})
		.from(domain)
		.where(isNotNull(domain.verifiedAt));
	for (const row of rows) await publishDkimKey(row);
	return rows.length;
}
