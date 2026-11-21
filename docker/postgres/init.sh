#!/bin/sh
# Runs once, when the postgres volume is created.
# Creates the read-only role postfix + dovecot use. The app's migrations grant
# it SELECT on the mail_* views (and nothing else).
set -eu
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -v pw="$POSTGRES_MAILSERVER_PASSWORD" <<'SQL'
CREATE ROLE mailserver LOGIN PASSWORD :'pw';
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO mailserver;
SQL
