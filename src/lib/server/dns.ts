import { Resolver } from 'node:dns/promises';
import { MAILCORE_HOSTNAME } from '$app/env/private';
import type { Domain } from './db/schema';

// Ask public resolvers so results aren't stuck in a local cache after the user edits DNS.
const resolver = new Resolver({ timeout: 3000, tries: 2 });
resolver.setServers(['1.1.1.1', '9.9.9.9']);

export type DnsStatus = 'ok' | 'warn' | 'missing';

export type DnsRecord = {
	key: 'mx' | 'spf' | 'dkim' | 'dmarc';
	label: string;
	type: 'MX' | 'TXT';
	/** host relative to the domain, '@' = the domain itself */
	host: string;
	value: string;
	status: DnsStatus;
	found: string[];
	hint?: string;
};

const trimDot = (s: string) => s.replace(/\.$/, '').toLowerCase();

async function txt(name: string) {
	try {
		return (await resolver.resolveTxt(name)).map((chunks) => chunks.join(''));
	} catch {
		return [];
	}
}

export function expectedRecords(d: Pick<Domain, 'dkimSelector' | 'dkimPublicKey'>) {
	const host = MAILCORE_HOSTNAME!;
	return {
		mx: `10 ${host}.`,
		spf: 'v=spf1 mx -all',
		dkim: `v=DKIM1; k=rsa; p=${d.dkimPublicKey}`,
		dmarc: 'v=DMARC1; p=quarantine; adkim=s; aspf=s'
	};
}

export async function checkDns(d: Pick<Domain, 'name' | 'dkimSelector' | 'dkimPublicKey'>) {
	const expected = expectedRecords(d);
	const host = trimDot(MAILCORE_HOSTNAME!);

	const [mx, rootTxt, dkimTxt, dmarcTxt] = await Promise.all([
		resolver.resolveMx(d.name).catch(() => []),
		txt(d.name),
		txt(`${d.dkimSelector}._domainkey.${d.name}`),
		txt(`_dmarc.${d.name}`)
	]);

	const records: DnsRecord[] = [];

	// MX: must point at our mail host. Other MX entries mean mail may go elsewhere.
	{
		const found = mx.map((m) => `${m.priority} ${trimDot(m.exchange)}`);
		const ours = mx.some((m) => trimDot(m.exchange) === host);
		records.push({
			key: 'mx',
			label: 'Mail server (MX)',
			type: 'MX',
			host: '@',
			value: expected.mx,
			found,
			status: !ours ? 'missing' : mx.length > 1 ? 'warn' : 'ok',
			hint:
				ours && mx.length > 1
					? 'Other MX records exist. Remove them so all mail arrives here.'
					: undefined
		});
	}

	// SPF: exactly one record, and it should authorize our MX.
	{
		const found = rootTxt.filter((t) => t.toLowerCase().startsWith('v=spf1'));
		const hasMx = found.length === 1 && /\s\+?mx(\s|$)/.test(` ${found[0].toLowerCase()} `);
		records.push({
			key: 'spf',
			label: 'Sender policy (SPF)',
			type: 'TXT',
			host: '@',
			value: expected.spf,
			found,
			status: found.length === 0 ? 'missing' : hasMx ? 'ok' : 'warn',
			hint:
				found.length > 1
					? 'Multiple SPF records are invalid. Keep only one.'
					: found.length && !hasMx
						? 'Your SPF record does not contain "mx". Make sure it allows this server.'
						: undefined
		});
	}

	// DKIM: the published key must match ours.
	{
		const found = dkimTxt.filter((t) => t.includes('p='));
		const pub = (t: string) => /p=([^;\s]+)/.exec(t.replace(/\s+/g, ''))?.[1];
		const match = found.some((t) => pub(t) === d.dkimPublicKey);
		records.push({
			key: 'dkim',
			label: 'Signature key (DKIM)',
			type: 'TXT',
			host: `${d.dkimSelector}._domainkey`,
			value: expected.dkim,
			found,
			status: match ? 'ok' : found.length ? 'warn' : 'missing',
			hint: !match && found.length ? 'A key is published but it does not match.' : undefined
		});
	}

	// DMARC: any valid record is fine.
	{
		const found = dmarcTxt.filter((t) => t.toLowerCase().startsWith('v=dmarc1'));
		records.push({
			key: 'dmarc',
			label: 'Policy (DMARC)',
			type: 'TXT',
			host: '_dmarc',
			value: expected.dmarc,
			found,
			status: found.length === 1 ? 'ok' : found.length ? 'warn' : 'missing',
			hint: found.length > 1 ? 'Multiple DMARC records are invalid. Keep only one.' : undefined
		});
	}

	return records;
}
