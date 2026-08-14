#!/usr/bin/env bash
set -u

echo "Samvio status"
systemctl is-active --quiet samvio && echo "Node: OK" || echo "Node: FEIL"
curl --fail --silent http://127.0.0.1:3000/readyz >/dev/null && echo "Database: OK" || echo "Database: FEIL"
df -h /var/lib/samvio | awk 'NR==2 {print "Disk: " $5}'
free | awk '/Mem:/ {printf "RAM: %.0f%%\n", $3/$2*100}'
du -sh /var/lib/samvio/uploads 2>/dev/null | awk '{print "Uploads: " $1}'
