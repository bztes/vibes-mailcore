import { DOVECOT_DOVEADM_PASSWORD, APP_DOVEADM_URL } from '$app/env/private';

type QuotaRow = { username: string; type: 'STORAGE' | 'MESSAGE'; value: string; limit: string };

/**
 * Storage used per mailbox for one domain, in bytes.
 * Uses dovecot's doveadm HTTP API; returns an empty map if dovecot is unreachable
 * (the UI then simply doesn't show usage).
 */
export async function storageUsage(domainName: string): Promise<Partial<Record<string, number>>> {
	if (!DOVECOT_DOVEADM_PASSWORD) return {};
	try {
		const res = await fetch(`${APP_DOVEADM_URL}/doveadm/v1`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization:
					'Basic ' + Buffer.from(`doveadm:${DOVECOT_DOVEADM_PASSWORD}`).toString('base64')
			},
			body: JSON.stringify([['quotaGet', { user: `*@${domainName}` }, 'q']]),
			signal: AbortSignal.timeout(3000)
		});
		if (!res.ok) return {};
		const [[type, rows]] = (await res.json()) as [[string, QuotaRow[]]];
		if (type !== 'doveadmResponse') return {};
		const usage: Partial<Record<string, number>> = {};
		for (const row of rows) {
			// count driver reports STORAGE in KiB
			if (row.type === 'STORAGE') usage[row.username] = Number(row.value) * 1024;
		}
		return usage;
	} catch {
		return {};
	}
}
