import { redirect } from '@sveltejs/kit';
import type { Handle, HandleServerError, ServerInit } from '@sveltejs/kit/hooks';
import { building } from '$app/env';
import { runMigrations } from '#lib/server/db/index.js';
import { SESSION_COOKIE, STAGE_PATHS, stageRoute, validateSession } from '#lib/server/auth.js';
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
	const current = await validateSession(event.cookies.get(SESSION_COOKIE));
	event.locals.session = current;
	event.locals.user = current?.stage === 'full' ? current.user : null;

	// pages are otherwise guarded by remote functions; this only routes unfinished logins
	const path = event.url.pathname;
	if (!event.isRemoteRequest && !path.startsWith('/_app') && path !== '/health') {
		const pendingRoute = stageRoute(current?.stage);
		if (pendingRoute) {
			if (path !== pendingRoute) redirect(303, pendingRoute);
		} else if (STAGE_PATHS.includes(path)) {
			redirect(303, event.locals.user ? '/' : '/login');
		}
	}
	return resolve(event);
};

export const handleError: HandleServerError = ({ kind, error }) => {
	if (kind === 'unknown') console.error(error);
	if (kind === 'validation') return { message: 'Invalid request' };
};
