#!/bin/sh
# Checks the .env switches, then starts rspamd. The config in local.d reads them
# as {= env.NAME =} (rspamd strips the RSPAMD_ prefix).
set -eu

case "$RSPAMD_GREYLISTING" in
  on | off) ;;
  *) echo "RSPAMD_GREYLISTING must be on or off, got '$RSPAMD_GREYLISTING'" >&2; exit 1 ;;
esac

if ! echo "$RSPAMD_SPAM_REJECT_SCORE" | grep -Eq '^[0-9]+$' || [ "$RSPAMD_SPAM_REJECT_SCORE" -le 6 ]; then
  echo "RSPAMD_SPAM_REJECT_SCORE must be a whole number above 6, got '$RSPAMD_SPAM_REJECT_SCORE'" >&2
  exit 1
fi

exec rspamd -f
