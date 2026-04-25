#!/bin/bash

# Deployment script for nginx reverse proxy config
# Usage: ./deploy.sh [server-ip]

SERVER_IP=${1:-"YOUR_SERVER_IP"}

echo "Uploading nginx configuration..."
scp nginx.conf root@$SERVER_IP:/etc/nginx/sites-available/examroomedu

echo "Enabling site and reloading nginx..."
ssh root@$SERVER_IP "ln -sf /etc/nginx/sites-available/examroomedu /etc/nginx/sites-enabled/ && nginx -t && systemctl reload nginx"

echo "Nginx reverse proxy configured! Your site should be live at https://examroomedu.com/3/"
echo "Make sure your Docker containers are running on the configured ports."