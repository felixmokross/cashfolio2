FROM redis/redis-stack:latest

COPY infra/cashfolio-redis/redis.conf /etc/redis/redis.conf
COPY infra/cashfolio-redis/entrypoint.sh /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

CMD ["redis-stack", "/etc/redis/redis.conf"]