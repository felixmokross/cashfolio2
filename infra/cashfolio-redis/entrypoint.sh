#!/bin/sh
set -e

if [ -z "$REDIS_ADMIN_PASS" ] || [ -z "$REDIS_APP_PASS" ]; then
  echo "❌ Missing REDIS_ADMIN_PASS or REDIS_APP_PASS environment variables."
  echo "   Make sure you've set them using 'fly secrets set'."
  exit 1
fi

ACL_FILE="/data/users.acl"

echo "🔐 Generating Redis ACL file at $ACL_FILE…"
cat <<EOF > "$ACL_FILE"
user default off
user admin on >$REDIS_ADMIN_PASS ~* +@all
user cashfolio-app on >$REDIS_APP_PASS ~* +@read +@write -@dangerous
EOF
echo "✅ ACL file written."

echo "🚀 Starting Redis…"
exec redis-server /etc/redis/redis.conf