import type { getDomain } from '#lib/remote/domains.remote.js';

export type DomainDetail = Awaited<ReturnType<typeof getDomain>>;
export type MailboxRow = DomainDetail['mailboxes'][number];
export type AliasRow = DomainDetail['aliases'][number];
