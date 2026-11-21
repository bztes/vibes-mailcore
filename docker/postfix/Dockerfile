# Postfix has no official image, so this installs it and adds our config.
# Rebuilt weekly so Debian fixes are picked up.
FROM debian:trixie-slim
RUN apt-get update \
 && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
      postfix postfix-pgsql postfix-lmdb ca-certificates openssl \
 && rm -rf /var/lib/apt/lists/*
COPY entrypoint.sh main.cf master.cf /config/
ENTRYPOINT ["/bin/sh", "/config/entrypoint.sh"]
