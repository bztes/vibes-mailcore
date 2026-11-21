import type { Handle, HandleServerError, ServerInit } from '@sveltejs/kit/hooks';
import { building } from '$app/env';
import { runMigrations } from '#lib/server/db/index.js';
import { SESSION_COOKIE, validateSession } from '#lib/server/auth.js';
import { syncDkimKeys } from '#lib/server/dkim.js';

export const init: ServerInit = async () => {
	if (building) return;

	await runMigrations();

	try {
		const n = await syncDkimKeys();
		console.log(`[mailcore] Synced ${n} DKIM key(s) to redis`);
	} catch (e) {
		console.error('[mailcore] DKIM sync failed, outgoing mail will be unsigned:', e);
	}
};

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.user = await validateSession(event.cookies.get(SESSION_COOKIE));
	return resolve(event);
};

export const handleError: HandleServerError = ({ kind, error }) => {
	if (kind === 'unknown') console.error(error);
	if (kind === 'validation') return { message: 'Invalid request' };
};
