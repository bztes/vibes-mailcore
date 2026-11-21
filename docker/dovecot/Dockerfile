# Official image plus our config. Rebuilt weekly so upstream fixes are picked up.
FROM dovecot/dovecot:2.4.5-root
COPY entrypoint.sh dovecot.conf /config/
COPY sieve /config/sieve
ENTRYPOINT ["/usr/bin/tini", "--", "/bin/sh", "/config/entrypoint.sh"]
