# Official image plus our config. Rebuilt weekly so upstream fixes are picked up.
FROM rspamd/rspamd:4.3
COPY entrypoint.sh /config/
COPY local.d /etc/rspamd/local.d
ENTRYPOINT ["/bin/sh", "/config/entrypoint.sh"]
