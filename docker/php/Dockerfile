FROM php:8.3-fpm-alpine

# Yüklenen görselleri küçültüp WebP'ye çevirmek için GD
RUN apk add --no-cache libpng libjpeg-turbo libwebp freetype \
 && apk add --no-cache --virtual .build-deps libpng-dev libjpeg-turbo-dev libwebp-dev freetype-dev \
 && docker-php-ext-configure gd --with-jpeg --with-webp --with-freetype \
 && docker-php-ext-install -j"$(nproc)" gd exif \
 && apk del .build-deps

COPY php.ini /usr/local/etc/php/conf.d/site.ini
COPY fpm.conf /usr/local/etc/php-fpm.d/zz-site.conf
