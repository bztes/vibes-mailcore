# Contributing

## How it fits together

The UI only writes to Postgres; the mail daemons read their data from there, so changes apply immediately without reloads.

```
incoming mail ──▶ postfix :25 ──▶ rspamd (spam check) ──▶ dovecot ──▶ mail volume
mail apps     ──▶ postfix :465/:587 ──▶ rspamd (DKIM sign) ──▶ internet
mail apps     ──▶ dovecot :993 (IMAP)

admin UI (app) ──writes──▶ postgres ◀──reads (views)── postfix, dovecot
               ──DKIM keys──▶ redis ◀──reads── rspamd
```

| Service    | Image                                           | Job                                                         |
| ---------- | ----------------------------------------------- | ----------------------------------------------------------- |
| `app`      | `Dockerfile`                                    | SvelteKit admin UI                                          |
| `postfix`  | `docker/postfix` (Debian + postfix)             | SMTP in/out                                                 |
| `dovecot`  | `docker/dovecot` (`dovecot/dovecot:2.4.5-root`) | IMAP, logins, storage, quota, spam → Junk                   |
| `rspamd`   | `docker/rspamd` (`rspamd/rspamd:4.3`)           | spam filter, DKIM/ARC signing                               |
| `unbound`  | `docker/unbound` (Debian + unbound)             | DNS resolver for rspamd, so blocklists like Spamhaus answer |
| `postgres` | `docker/postgres` (`postgres:18-alpine`)        | source of truth                                             |
| `redis`    | `redis:8-alpine`                                | rspamd data, DKIM keys                                      |

Every image except redis is built from this repo with its config baked in. The [Images workflow](.github/workflows/images.yml) pushes them on each release and rebuilds the latest release every Monday on fresh base images, so upstream security fixes arrive with `docker compose pull`.

Emails are stored by dovecot as Maildir in the `mail` volume. Postgres only holds configuration.

## Development

```sh
pnpm install
cp .env.example .env    # fill it in, and enable the "local development" lines
pnpm dev:docker         # everything except the app, in docker
pnpm dev
```

`compose.dev.yml` publishes postgres, redis and the doveadm API on localhost and skips the app container. If ports like 25 or 5432 are taken on your machine, set `POSTFIX_SMTP_PORT`, `POSTGRES_PORT` and so on in `.env`.

Useful commands:

```sh
pnpm check                                         # types
pnpm db:generate                                   # after changing src/lib/server/db/schema.ts
docker compose logs -f postfix dovecot rspamd
docker compose exec postfix postqueue -p           # mail queue
docker compose exec dovecot doveadm quota get -u jane@example.com
```

To run your own changes on a server instead of a release: `docker compose up -d --build --force-recreate`.

## Code map

- [src/lib/server/db/schema.ts](src/lib/server/db/schema.ts): tables plus the `mail_*` views that postfix and dovecot read (the contract between app and mail daemons)
- [src/lib/remote/](src/lib/remote/): remote functions (`query` / `form`) used by the pages
- [src/lib/components/ui/](src/lib/components/ui/): UI components, styles in [variants.ts](src/lib/components/ui/variants.ts) (tailwind-variants)
- [src/lib/server/dkim.ts](src/lib/server/dkim.ts): key generation and syncing keys to redis for rspamd
- [src/lib/server/dns.ts](src/lib/server/dns.ts): the DNS check shown on each domain
- [docker/](docker/): one folder per service with its Dockerfile and config (in dev, the config is mounted from `./docker` directly, so edits only need a restart)
