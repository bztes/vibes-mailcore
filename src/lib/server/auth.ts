import { createHash, randomBytes } from 'node:crypto';
import { error, redirect } from '@sveltejs/kit';
import { eq, sql } from 'drizzle-orm';
import { getRequestEvent } from '$app/server';
import { db } from './db';
import { account, session, type Account } from './db/schema';
import { verifyPassword } from './password';
import { hasTotp } from './totp';

export const SESSION_COOKIE = 'session';
const SESSION_DAYS = 30;
const DAY = 24 * 60 * 60 * 1000;

export type SessionUser = Pick<Account, 'id' | 'email' | 'name' | 'role'>;

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

/** Re-authentication, e.g. before turning off two-factor auth. */
export async function checkUserPassword(accountId: string, password: string) {
	const [found] = await db
		.select({ passwordHash: account.passwordHash })
		.from(account)
		.where(eq(account.id, accountId));
	return !!found && (await verifyPassword(found.passwordHash, password));
}

/**
 * A login runs through stages; only `full` sessions are logged in. Every other
 * stage is limited to its own page and expires quickly.
 */
const STAGES = {
	full: { ttl: SESSION_DAYS * DAY, route: null },
	/** password ok, second factor missing */
	mfa: { ttl: 5 * 60 * 1000, route: '/login/verify' }
} as const;
type SessionStage = keyof typeof STAGES;

export const stageRoute = (stage: SessionStage | undefined) => (stage ? STAGES[stage].route : null);
export const STAGE_PATHS: string[] = Object.values(STAGES).flatMap((s) => s.route ?? []);

/** wrong second-factor codes before the password has to be entered again */
const MFA_MAX_ATTEMPTS = 5;

function setCookie(token: string, stage: SessionStage, expiresAt: Date) {
	getRequestEvent().cookies.set(SESSION_COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		// pending logins only live as long as the browser session
		expires: stage === 'full' ? expiresAt : undefined
	});
}

const currentSessionId = () => {
	const token = getRequestEvent().cookies.get(SESSION_COOKIE);
	return token ? sha256(token) : null;
};

async function createSession(accountId: string, stage: SessionStage) {
	const token = randomBytes(32).toString('base64url');
	const expiresAt = new Date(Date.now() + STAGES[stage].ttl);
	await db.insert(session).values({ id: sha256(token), accountId, expiresAt, stage });
	setCookie(token, stage, expiresAt);
}

/**
 * Every login method ends here once the user is identified: either a full
 * session, or a pending one when a second factor is still needed.
 * Returns where to go next.
 */
export async function startLogin(accountId: string) {
	const stage: SessionStage = (await hasTotp(accountId)) ? 'mfa' : 'full';
	await createSession(accountId, stage);
	return STAGES[stage].route ?? '/';
}

/** Turns the pending session into a full one (with a new token). */
export async function upgradeSession() {
	const oldId = currentSessionId();
	if (!oldId) return;
	const token = randomBytes(32).toString('base64url');
	const expiresAt = new Date(Date.now() + STAGES.full.ttl);
	await db
		.update(session)
		.set({ id: sha256(token), stage: 'full', expiresAt, mfaFailures: 0 })
		.where(eq(session.id, oldId));
	setCookie(token, 'full', expiresAt);
}

/** Counts a wrong second-factor code. Ends the pending login once the limit is reached. */
export async function recordMfaFailure() {
	const id = currentSessionId();
	if (!id) return false;
	const [row] = await db
		.update(session)
		.set({ mfaFailures: sql`${session.mfaFailures} + 1` })
		.where(eq(session.id, id))
		.returning({ n: session.mfaFailures });
	if (row && row.n < MFA_MAX_ATTEMPTS) return true;
	await destroySession();
	return false;
}

/** Resolve the session cookie. Extends full sessions that are past half their life. */
export async function validateSession(
	token: string | undefined
): Promise<{ user: SessionUser; stage: SessionStage } | null> {
	if (!token) return null;
	const id = sha256(token);
	const [row] = await db
		.select({
			expiresAt: session.expiresAt,
			stage: session.stage,
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
	if (row.stage === 'full' && row.expiresAt.getTime() - Date.now() < STAGES.full.ttl / 2) {
		await db
			.update(session)
			.set({ expiresAt: new Date(Date.now() + STAGES.full.ttl) })
			.where(eq(session.id, id));
	}
	return { user: row.user, stage: row.stage };
}

export async function destroySession() {
	const id = currentSessionId();
	if (id) await db.delete(session).where(eq(session.id, id));
	getRequestEvent().cookies.delete(SESSION_COOKIE, { path: '/' });
}

/** The user of a pending login in the given stage; otherwise back to the login page. */
export function requireStage(stage: Exclude<SessionStage, 'full'>): SessionUser {
	const current = getRequestEvent().locals.session;
	if (current?.stage !== stage) redirect(303, '/login');
	return current.user;
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
