import { createHash, randomBytes } from 'node:crypto';
import { error, redirect, type Cookies } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { getRequestEvent } from '$app/server';
import { db } from './db';
import { account, session, type Account } from './db/schema';

export const SESSION_COOKIE = 'session';
const SESSION_DAYS = 30;
const DAY = 24 * 60 * 60 * 1000;

export type SessionUser = Pick<Account, 'id' | 'email' | 'name' | 'role'>;

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

export async function createSession(cookies: Cookies, accountId: string) {
	const token = randomBytes(32).toString('base64url');
	const expiresAt = new Date(Date.now() + SESSION_DAYS * DAY);
	await db.insert(session).values({ id: sha256(token), accountId, expiresAt });
	cookies.set(SESSION_COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		expires: expiresAt
	});
}

/** Resolve the session cookie to a user. Extends sessions that are past half their life. */
export async function validateSession(token: string | undefined): Promise<SessionUser | null> {
	if (!token) return null;
	const id = sha256(token);
	const [row] = await db
		.select({
			expiresAt: session.expiresAt,
			user: { id: account.id, email: account.email, name: account.name, role: account.role }
		})
		.from(session)
		.innerJoin(account, eq(account.id, session.accountId))
		.where(eq(session.id, id));

	if (!row) return null;
	if (row.expiresAt.getTime() < Date.now()) {
		await db.delete(session).where(eq(session.id, id));
		return null;
	}
	if (row.expiresAt.getTime() - Date.now() < (SESSION_DAYS / 2) * DAY) {
		await db
			.update(session)
			.set({ expiresAt: new Date(Date.now() + SESSION_DAYS * DAY) })
			.where(eq(session.id, id));
	}
	return row.user;
}

export async function destroySession(cookies: Cookies) {
	const token = cookies.get(SESSION_COOKIE);
	if (token) await db.delete(session).where(eq(session.id, sha256(token)));
	cookies.delete(SESSION_COOKIE, { path: '/' });
}

/** For queries/forms: redirect to /login when not logged in. */
export function requireUser(): SessionUser {
	const { locals } = getRequestEvent();
	if (!locals.user) redirect(303, '/login');
	return locals.user;
}

/** For commands (which cannot redirect). */
export function requireUserOr401(): SessionUser {
	const { locals } = getRequestEvent();
	if (!locals.user) error(401, 'Not logged in');
	return locals.user;
}

export function requireAdmin(): SessionUser {
	const user = requireUser();
	if (user.role !== 'admin') error(403, 'Admins only');
	return user;
}
