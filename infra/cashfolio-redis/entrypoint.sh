#!/bin/sh
set -e

if [ -z "$REDIS_ADMIN_PASS" ] || [ -z "$REDIS_APP_PASS" ]; then
  echo "❌ Missing REDIS_ADMIN_PASS or REDIS_APP_PASS environment variables."
  echo "   Make sure you've set them using 'fly secrets set'."
  exit 1
fi

ACL_FILE="/etc/redis/users.acl"

REDIS_ADMIN_PASS_HASH=$(printf %s "$REDIS_ADMIN_PASS" | sha256sum | awk '{printf $1}')
REDIS_APP_PASS_HASH=$(printf %s "$REDIS_APP_PASS" | sha256sum | awk '{printf $1}')

echo "🔐 Generating Redis ACL file at $ACL_FILE…"
cat <<EOF > "$ACL_FILE"
user default off
user admin on #$REDIS_ADMIN_PASS_HASH ~* +@all
user cashfolio-app on #$REDIS_APP_PASS_HASH ~* +@read +@write -@dangerous
EOF

echo "✅ ACL file written."

echo "🚀 Starting Redis as redis…"
exec setpriv --reuid redis --regid redis --init-groups /usr/local/bin/docker-entrypoint.sh redis-server /etc/redis/redis.conf