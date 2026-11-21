# Official image plus the script that creates the read-only mailserver role.
# Rebuilt weekly so upstream fixes are picked up.
FROM postgres:18-alpine
COPY init.sh /docker-entrypoint-initdb.d/
