# Mailcore

A small self-hosted mail server (postfix, dovecot, rspamd) with a simple web UI to manage domains, mailboxes and aliases. Development notes are in [CONTRIBUTING.md](CONTRIBUTING.md).

## Install

Requirements: Docker with compose, a reverse proxy that gets TLS certificates (e.g. Caddy), and a hosting provider that lets you set reverse DNS.

| Service       | Ports        | Domain              | Certificate                        |
| ------------- | ------------ | ------------------- | ---------------------------------- |
| postfix       | 25, 465, 587 | `mail.example.com`  | `mail.example.com`, from the proxy |
| dovecot       | 993          | `mail.example.com`  | `mail.example.com`, from the proxy |
| app           | 3000         | `admin.example.com` | none, the proxy terminates TLS     |
| reverse proxy | 80, 443      | both                | obtains both                       |

Each port can be changed in `.env` (`POSTFIX_SMTP_PORT`, `DOVECOT_IMAPS_PORT`, `APP_PORT`, …).

1. **DNS for the server** (once):
   - `A` record `mail.example.com` → server IP (and `AAAA` if you use IPv6)
   - `A` record `admin.example.com` → server IP
   - Reverse DNS (PTR) of the server IP → `mail.example.com`, set at your hosting provider
2. **Reverse proxy**: proxy `https://admin.example.com` to the app port (pass `X-Forwarded-For`) and get a TLS certificate for `mail.example.com`, which postfix and dovecot use.
3. **Config**: `cp .env.example .env` and fill it in. Point `MAILCORE_CERT_DIR` to the folder holding `mail.example.com.crt` and `.key` (for Caddy in Docker, inside its data volume).

**Backups** (not included):

- volume `mailcore_postgres`: database
- volume `mailcore_mail`: emails
- volume `mailcore_redis`: DKIM keys (without them you must publish new DKIM records after a restore)

**Migrating**: create domains and mailboxes in the UI, copy mail with [imapsync](https://imapsync.lamiral.info/), switch MX records last.

## Defaults

Variables can be changed in `.env` (see [.env.example](.env.example)), then `docker compose up -d`. A wrong value stops the service with a message; see `docker compose logs <service>`.

- Mailboxes may only send as their own address and aliases forwarding to them. Plus addressing works (`jane+shop@` → `jane@`).
- Spam: score ≥ 6 goes to Junk, ≥ 15 is rejected (`RSPAMD_SPAM_REJECT_SCORE`). Greylisting off (`RSPAMD_GREYLISTING`).
- rspamd uses its own DNS resolver (unbound), because blocklists like Spamhaus refuse shared resolvers.
- Junk and Trash emptied after 30 days (`DOVECOT_AUTO_DELETE_DAYS`, 0 = never).
- Mailbox limit 5 GB (`APP_DEFAULT_MAILBOX_GB`), changeable per mailbox.
- DKIM: 2048-bit key per domain. A domain only goes live once its DKIM record is found in DNS; that's also the proof of ownership.

## Known limitations

- No SRS: forwarding to external addresses may be rejected by strict SPF/DMARC senders.
- Deleting a domain or mailbox keeps its mail on disk.
- No auto-reply / vacation in the UI yet.
