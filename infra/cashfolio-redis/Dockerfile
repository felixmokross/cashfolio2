FROM redis:8

# Install RedisTimeSeries from the official Redis packages
RUN apt-get update && \
    apt-get install -y software-properties-common && \
    add-apt-repository ppa:redislabs/redis && \
    apt-get update && \
    apt-get install -y redis-timeseries && \
    rm -rf /var/lib/apt/lists/*

COPY infra/cashfolio-redis/redis.conf /etc/redis/redis.conf
COPY infra/cashfolio-redis/entrypoint.sh /usr/local/bin/entrypoint.sh

EXPOSE 6379
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
