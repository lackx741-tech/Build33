# PHP RPC / REST gateway.
# Build context is the repository root:  docker build -f deployment/Dockerfile.php .

FROM php:8.2-cli-alpine

RUN apk add --no-cache curl-dev oniguruma-dev \
    && docker-php-ext-install curl \
    && rm -rf /var/cache/apk/*

WORKDIR /app

RUN addgroup -S blower && adduser -S blower -G blower

COPY php/ ./

# Composer is only needed for the dev/test toolchain; the runtime loads classes
# through bootstrap.php, so a plain copy is sufficient for serving.
RUN mkdir -p /tmp/blower-ratelimit && chown -R blower:blower /app /tmp/blower-ratelimit
USER blower

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD php -r "exit(@file_get_contents('http://127.0.0.1:8080/api/health') ? 0 : 1);"

# secureproxy.php is the hardened front controller.
CMD ["php", "-S", "0.0.0.0:8080", "secureproxy.php"]
