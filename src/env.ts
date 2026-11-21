import { defineEnvVars } from '@sveltejs/kit/env';
import { building } from '$app/env';
import * as v from 'valibot';

const required = building ? v.optional(v.string()) : v.pipe(v.string(), v.nonEmpty());

export const variables = defineEnvVars({
	APP_DATABASE_URL: {
		description: 'Postgres connection string for the app (owner of the schema).',
		schema: required
	},
	APP_REDIS_URL: {
		description: 'Redis used by rspamd. The app writes DKIM keys into it.',
		schema: v.optional(v.string(), 'redis://localhost:6379')
	},
	MAILCORE_HOSTNAME: {
		description:
			'Public hostname of the mail server, e.g. mail.example.com. MX records point here.',
		schema: required
	},
	APP_DEFAULT_MAILBOX_GB: {
		description: 'Size limit (GB) pre-filled when creating a mailbox. Default 5.',
		schema: (value) => {
			if (value === undefined || value === '') return 5;
			const gb = Number(value);
			if (!Number.isInteger(gb) || gb < 1 || gb > 2000) {
				throw new Error(
					`APP_DEFAULT_MAILBOX_GB must be a whole number from 1 to 2000, got '${value}'`
				);
			}
			return gb;
		}
	},
	APP_DOVEADM_URL: {
		description: "Dovecot's doveadm HTTP API, used to read quota usage.",
		schema: v.optional(v.string(), 'http://dovecot:8080')
	},
	DOVECOT_DOVEADM_PASSWORD: {
		description: 'Password for the doveadm HTTP API.',
		schema: v.optional(v.string())
	}
});
