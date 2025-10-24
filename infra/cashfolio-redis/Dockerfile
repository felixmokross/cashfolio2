FROM redis:8

COPY infra/cashfolio-redis/redis.conf /etc/redis/redis.conf
COPY infra/cashfolio-redis/entrypoint.sh /usr/local/bin/entrypoint.sh

EXPOSE 6379
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
