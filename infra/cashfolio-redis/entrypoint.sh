#!/bin/sh
set -e

if [ -z "$REDIS_ADMIN_PASS" ] || [ -z "$REDIS_APP_PASS" ]; then
  echo "❌ Missing REDIS_ADMIN_PASS or REDIS_APP_PASS environment variables."
  echo "   Make sure you've set them using 'fly secrets set'."
  exit 1
fi

echo "🔐 Generating Redis ACL file at $ACL_FILE..."
cat > /data/users.acl <<EOF
user default off
user admin on >$REDIS_ADMIN_PASS ~* +@all
user cashfolio-app on >$REDIS_APP_PASS ~* +@read +@write +@set +@keyspace -@dangerous
EOF
