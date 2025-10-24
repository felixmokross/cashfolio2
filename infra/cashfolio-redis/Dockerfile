FROM redis/redis-stack:latest

COPY redis.conf /etc/redis/redis.conf
COPY entrypoint.sh /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]