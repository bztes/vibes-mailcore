// See https://svelte.dev/docs/kit/types#app.d.ts
import type { SessionUser, validateSession } from '#lib/server/auth.js';

declare global {
	namespace App {
		interface Locals {
			/** any session, including logins that are not finished yet */
			session: Awaited<ReturnType<typeof validateSession>>;
			/** only set for fully logged in sessions */
			user: SessionUser | null;
		}
	}
}

export {};
