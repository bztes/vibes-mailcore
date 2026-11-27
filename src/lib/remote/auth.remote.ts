import * as v from 'valibot';
import { invalid, redirect } from '@sveltejs/kit';
import { eq, sql } from 'drizzle-orm';
import { form, getRequestEvent, query } from '$app/server';
import { db } from '#lib/server/db/index.js';
import { account } from '#lib/server/db/schema.js';
import {
	checkUserPassword,
	destroySession,
	recordMfaFailure,
	requireStage,
	requireUser,
	startLogin,
	upgradeSession
} from '#lib/server/auth.js';
import { hashPassword, verifyPassword } from '#lib/server/password.js';
import { verifySecondFactor } from '#lib/server/totp.js';
import { changePasswordSchema, email as emailSchema, password } from '#lib/schemas.js';

// Simple in-memory brute-force protection: 10 failed logins per IP per 15 minutes.
const WINDOW = 15 * 60 * 1000;
const failures = new Map<string, { count: number; since: number }>();

function tooManyAttempts(ip: string) {
	const f = failures.get(ip);
	if (f && Date.now() - f.since > WINDOW) failures.delete(ip);
	return (failures.get(ip)?.count ?? 0) >= 10;
}

function recordFailure(ip: string) {
	const f = failures.get(ip) ?? { count: 0, since: Date.now() };
	f.count++;
	failures.set(ip, f);
}

// A valid hash to verify against when the account doesn't exist (constant-ish timing).
const dummyHash = hashPassword('not-a-real-password');

export const getMe = query(() => requireUser());

async function hasAccounts() {
	const [row] = await db.select({ id: account.id }).from(account).limit(1);
	return !!row;
}

/** True until the first account exists. The login page then shows the sign-up form. */
export const needsSetup = query(async () => !(await hasAccounts()));

/** First sign-up: creates the admin account. Closed as soon as any account exists. */
export const setup = form(
	v.object({
		email: emailSchema,
		name: v.optional(v.pipe(v.string(), v.trim()), ''),
		_password: password
	}),
	async ({ email, name, _password }) => {
		const passwordHash = await hashPassword(_password);
		const id = await db.transaction(async (tx) => {
			// Serialize concurrent sign-ups so only the first one wins.
			await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('mailcore:setup'))`);
			const [existing] = await tx.select({ id: account.id }).from(account).limit(1);
			if (existing) return null;
			const [row] = await tx
				.insert(account)
				.values({ email, name, role: 'admin', passwordHash })
				.returning({ id: account.id });
			return row.id;
		});
		if (!id) invalid('Sign-up is closed. Sign in instead.');

		console.log(`[mailcore] Created admin account ${email}`);
		redirect(303, await startLogin(id));
	}
);

export const login = form(
	v.object({
		email: v.pipe(v.string(), v.trim(), v.toLowerCase(), v.nonEmpty('Enter your email')),
		_password: v.pipe(v.string(), v.nonEmpty('Enter your password'))
	}),
	async ({ email, _password }) => {
		const event = getRequestEvent();
		const ip = event.getClientAddress();
		if (tooManyAttempts(ip)) invalid('Too many attempts. Try again in a few minutes.');

		const [user] = await db.select().from(account).where(eq(account.email, email));
		const ok = await verifyPassword(user?.passwordHash ?? (await dummyHash), _password);
		if (!user || !ok) {
			recordFailure(ip);
			invalid('Wrong email or password');
		}

		failures.delete(ip);
		redirect(303, await startLogin(user.id));
	}
);

/** Second login step: TOTP code or recovery code. */
export const verifyLogin = form(v.object({ _code: v.string() }), async ({ _code }) => {
	const pending = requireStage('mfa');
	if (!(await verifySecondFactor(pending.id, _code))) {
		await new Promise((r) => setTimeout(r, 500));
		if (!(await recordMfaFailure())) redirect(303, '/login');
		invalid('Wrong code');
	}
	await upgradeSession();
	redirect(303, '/');
});

export const logout = form(async () => {
	await destroySession();
	redirect(303, '/login');
});

export const changePassword = form(changePasswordSchema, async ({ _current, _password }, issue) => {
	const me = requireUser();
	if (!(await checkUserPassword(me.id, _current))) {
		invalid(issue._current('Current password is wrong'));
	}
	await db
		.update(account)
		.set({ passwordHash: await hashPassword(_password) })
		.where(eq(account.id, me.id));
	return { saved: true };
});
