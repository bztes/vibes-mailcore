#!/bin/sh
set -eu

cp /config/main.cf /config/master.cf /etc/postfix/
postconf -e "myhostname=$MAILCORE_HOSTNAME" "smtpd_tls_chain_files=/certs/$MAILCORE_HOSTNAME.key,/certs/$MAILCORE_HOSTNAME.crt"

# Lookup tables for the app's mail_* views (read-only role).
mkdir -p /etc/postfix/pgsql
table() {
  cat > "/etc/postfix/pgsql/$1.cf" <<CF
hosts = postgres
dbname = mailcore
user = mailserver
password = $POSTGRES_MAILSERVER_PASSWORD
query = $2
CF
}
table domains       "SELECT 1 FROM mail_domains WHERE domain = lower('%s')"
table mailboxes     "SELECT 1 FROM mail_users WHERE address = lower('%s')"
table aliases       "SELECT destinations FROM mail_aliases WHERE address = lower('%s')"
table sender-logins "SELECT logins FROM mail_sender_logins WHERE address = lower('%s')"
chmod 640 /etc/postfix/pgsql/*.cf
chgrp postfix /etc/postfix/pgsql/*.cf

# Pick up the certificate after Caddy renews it.
(while sleep 86400; do postfix reload; done) &
postfix check
exec postfix start-fg
