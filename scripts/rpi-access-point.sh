#!/usr/bin/env bash
# ==============================================================================
# Raspberry Pi Standalone Access Point & Auto-Launch Provisioning Script
# Embedded Quiz System — Offline Classroom Edition
# ==============================================================================
set -e

echo "🍓 Initializing Raspberry Pi Standalone Hotspot Configuration..."

if [ "$EUID" -ne 0 ]; then
  echo "❌ Please run as root: sudo bash scripts/rpi-access-point.sh"
  exit 1
fi

AP_SSID="ClassQuiz-Offline"
AP_PASS="ClassQuiz2026"
AP_IP="192.168.4.1"
NETMASK="255.255.255.0"
WLAN_IFACE="wlan0"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "📦 1. Installing required networking packages (hostapd, dnsmasq)..."
apt-get update -y
apt-get install -y hostapd dnsmasq rfkill nodejs npm

# Unblock Wi-Fi
rfkill unblock wlan || true

echo "🛑 2. Temporarily stopping services..."
systemctl stop hostapd || true
systemctl stop dnsmasq || true

echo "🌐 3. Setting static IP on $WLAN_IFACE in /etc/dhcpcd.conf..."
if ! grep -q "interface $WLAN_IFACE" /etc/dhcpcd.conf 2>/dev/null; then
  cat <<EOF >> /etc/dhcpcd.conf

# Static IP for Embedded Quiz AP
interface $WLAN_IFACE
    static ip_address=$AP_IP/24
    nohook wpa_supplicant
EOF
fi

echo "⚙️ 4. Configuring dnsmasq (DHCP & Captive Portal DNS)..."
mv /etc/dnsmasq.conf /etc/dnsmasq.conf.orig 2>/dev/null || true
cat <<EOF > /etc/dnsmasq.conf
# DHCP server on wlan0
interface=$WLAN_IFACE
dhcp-range=192.168.4.2,192.168.4.100,$NETMASK,24h
domain=quiz.local
address=/quiz.local/$AP_IP
# Captive portal redirection
address=/#/$AP_IP
EOF

echo "📡 5. Configuring hostapd (Wi-Fi Access Point)..."
cat <<EOF > /etc/hostapd/hostapd.conf
interface=$WLAN_IFACE
driver=nl80211
ssid=$AP_SSID
hw_mode=g
channel=7
wmm_enabled=0
macaddr_acl=0
auth_algs=1
ignore_broadcast_ssid=0
wpa=2
wpa_passphrase=$AP_PASS
wpa_key_mgmt=WPA-PSK
wpa_pairwise=TKIP
rsn_pairwise=CCMP
EOF

# Point hostapd daemon to config
sed -i 's|#DAEMON_CONF=""|DAEMON_CONF="/etc/hostapd/hostapd.conf"|' /etc/default/hostapd 2>/dev/null || true

echo "🚀 6. Creating systemd service for Embedded Quiz..."
cat <<EOF > /etc/systemd/system/embedded-quiz.service
[Unit]
Description=Embedded Quiz System Node.js Server
After=network.target hostapd.service dnsmasq.service

[Service]
Type=simple
User=pi
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=production
Environment=PORT=7000
ExecStart=/usr/bin/node src/server.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

echo "🔄 7. Enabling and starting services..."
systemctl unmask hostapd
systemctl enable hostapd
systemctl restart hostapd

systemctl enable dnsmasq
systemctl restart dnsmasq

systemctl daemon-reload
systemctl enable embedded-quiz.service
systemctl restart embedded-quiz.service

echo ""
echo "=================================================================="
echo "✅ Raspberry Pi Hotspot & Quiz System Successfully Configured!"
echo "   SSID:      $AP_SSID"
echo "   Password:  $AP_PASS"
echo "   Hotspot IP:$AP_IP"
echo "   Quiz URL:  http://quiz.local:7000 or http://$AP_IP:7000"
echo "=================================================================="
