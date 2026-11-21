# Unbound has no official image, so this installs it and adds our config.
# Rebuilt weekly so Debian fixes are picked up.
FROM debian:trixie-slim
RUN apt-get update \
 && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
      unbound dns-root-data \
 && rm -rf /var/lib/apt/lists/*
COPY unbound.conf /config/
ENTRYPOINT ["unbound", "-d", "-c", "/config/unbound.conf"]
