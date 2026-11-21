# Mail from the docker network is NOT trusted; our own users are recognized
# by their SMTP login instead.
local_addrs = "127.0.0.0/8, ::1";

# Our own resolver (unbound service). Shared resolvers get refused by DNS
# blocklists like Spamhaus.
dns {
  nameserver = ["unbound:53"];
}
