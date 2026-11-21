#!/bin/sh
set -eu

mkdir -p /etc/dovecot/generated /etc/dovecot/sieve
cat > /etc/dovecot/generated/local.conf <<CONF
ssl_server {
  cert_file = /certs/$MAILCORE_HOSTNAME.crt
  key_file = /certs/$MAILCORE_HOSTNAME.key
}
pgsql postgres {
  parameters {
    dbname = mailcore
    user = mailserver
    password = $POSTGRES_MAILSERVER_PASSWORD
  }
}
doveadm_password = $DOVECOT_DOVEADM_PASSWORD
CONF
chmod 600 /etc/dovecot/generated/local.conf

# DOVECOT_AUTO_DELETE_DAYS in .env: empty Junk and Trash after this many days (0 = never).
case "$DOVECOT_AUTO_DELETE_DAYS" in
  '' | *[!0-9]*) echo "DOVECOT_AUTO_DELETE_DAYS must be a whole number (0 = never), got '$DOVECOT_AUTO_DELETE_DAYS'" >&2; exit 1 ;;
esac
if [ "$DOVECOT_AUTO_DELETE_DAYS" -gt 0 ]; then
  cat > /etc/dovecot/generated/features.conf <<CONF
namespace inbox {
  mailbox Junk {
    autoexpunge = ${DOVECOT_AUTO_DELETE_DAYS}d
  }
  mailbox Trash {
    autoexpunge = ${DOVECOT_AUTO_DELETE_DAYS}d
  }
}
CONF
else
  rm -f /etc/dovecot/generated/features.conf
fi

cp /config/dovecot.conf /etc/dovecot/dovecot.conf
cp /config/sieve/*.sieve /etc/dovecot/sieve/
sievec /etc/dovecot/sieve/spam-to-junk.sieve

chown vmail:vmail /srv/vmail
# Pick up the certificate after Caddy renews it.
(while sleep 86400; do doveadm reload; done) &
exec dovecot -F
