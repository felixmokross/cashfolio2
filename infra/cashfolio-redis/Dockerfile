FROM redis:8

COPY infra/cashfolio-redis/redis.conf /etc/redis/redis.conf
RUN chown -R redis:redis /etc/redis

COPY infra/cashfolio-redis/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chown -R redis:redis /data

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]