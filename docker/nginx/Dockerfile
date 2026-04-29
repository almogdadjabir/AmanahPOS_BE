FROM nginx:1.25-alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom proxy params
COPY proxy_params /etc/nginx/proxy_params

# Create log directory
RUN mkdir -p /var/log/nginx && \
    chown -R nginx:nginx /var/log/nginx

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
