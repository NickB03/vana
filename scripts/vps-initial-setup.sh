#!/bin/bash
# VPS Initial Security Setup
# Run this FIRST before runner setup

set -e

echo "🔒 Securing VPS..."

# Update system
apt update && apt upgrade -y

# Install essentials
apt install -y ufw fail2ban curl wget htop

# Setup firewall (allow SSH + HTTPS out)
ufw allow OpenSSH
ufw allow out 443/tcp
ufw allow out 80/tcp
ufw --force enable

# Configure fail2ban for SSH protection
systemctl enable fail2ban
systemctl start fail2ban

# Create swap (important for small VPS)
if [ ! -f /swapfile ]; then
    echo "Creating 2GB swap..."
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# Set up automatic updates
apt install -y unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades

echo "✅ VPS secured! Now run the runner setup script."