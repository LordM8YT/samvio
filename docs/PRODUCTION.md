# Samvio produksjonsrunbook

Målmiljøet er Ubuntu LTS på Webhuset, med Nginx foran en Node-prosess og MariaDB kun tilgjengelig lokalt. Kjøp, DNS-endringer og produksjonsinnlogging utføres først etter eksplisitt godkjenning.

## Filsystem og bruker

- applikasjon: `/opt/samvio/app`
- opplastinger: `/var/lib/samvio/uploads`
- privat miljøfil: `/etc/samvio/samvio.env` (`0600`, eier `samvio`)
- tjenestebruker: `samvio`, uten root-innlogging

Installer `ops/samvio.service` i `/etc/systemd/system/` og Nginx-filen i `/etc/nginx/sites-available/samvio`. Test alltid med `nginx -t` før reload.

## Påkrevde miljøvariabler

`NODE_ENV=production`, `HOST=127.0.0.1`, `PORT=3000`, `ORIGIN=https://samvio.no`, `AUTH_COOKIE_SECURE=true`, `BODY_SIZE_LIMIT=30M`, `SHUTDOWN_TIMEOUT=5`, `DATABASE_URL` og `UPLOAD_DIR=/var/lib/samvio/uploads`.

## Før DNS og HTTPS

1. Ta VPS-snapshot eller verifisert backup.
2. Kontroller at port 3306 ikke er offentlig og at brannmuren bare åpner SSH, 80 og 443.
3. Kjør migrasjoner, bygg appen og test `node build` lokalt på serveren.
4. Test `/healthz`, `/readyz`, registrering, innlogging, bildeopplasting og restart.
5. Kontroller eksisterende DNS før A/CNAME endres. Ikke rør MX/TXT.
6. Bestill Let's Encrypt først etter at DNS peker riktig.

## Backup

Production-backup bruker `scripts/backup-production.sh` og systemd-unitene `ops/samvio-backup.service` / `ops/samvio-backup.timer`.

Hvert snapshot inneholder database, uploads, metadata og SHA-256-checksums. Arkivene verifiseres før snapshotet markeres som ferdig. Standard lokal retention er 14 dager, og timeren kjører daglig rundt 03:15.

Installer og test backupoppsettet etter instruksjonene i [`docs/BACKUP.md`](./BACKUP.md). `scripts/restore-production.sh` er den dokumenterte restore-veien og krever eksplisitt `--confirm`.

Backup på samme VPS er bare første sikkerhetsnett. Off-server kopi med separat credentials/config skal etableres før alphaen får verdifulle brukerdata, og minst ett snapshot skal restore-testes i et separat miljø.
