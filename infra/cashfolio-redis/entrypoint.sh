#!/bin/sh
set -e

cat > /data/users.acl <<EOF
user default off
user admin on >$REDIS_ADMIN_PASS ~* +@all
user cashfolio-app on >$REDIS_APP_PASS ~* +@read +@write +@set +@keyspace +@ts
EOF

exec redis-server /etc/redis/redis.conf