# Samvio backup og restore

Samvio-backup kan kjøres uten root. Production-brukeren `samvio` kan lese `/etc/samvio/samvio.env` og `/var/lib/samvio/uploads`, så backup-scriptet bruker eksisterende `DATABASE_URL` og lager verifiserte snapshots under brukerens hjemmemappe.

Standard:

- snapshots: `~/backups/samvio/snapshots/<UTC-timestamp>/`
- database: `database.sql.gz`
- uploads: `uploads.tar.gz`
- metadata: `metadata.txt`
- checksums: `SHA256SUMS`
- lokal retention: 14 dager
- automatikk: GitHub Actions kjører daglig over den eksisterende deploy-SSH-nøkkelen

Backup-scriptet tester gzip/tar og SHA-256 før snapshotet markeres som ferdig. `DATABASE_URL` brukes bare lokalt i prosessen og skrives ikke til backupen eller loggene.

## Manuell backup uten sudo

```bash
cd /opt/samvio/app
bash scripts/backup-production.sh
```

Se siste snapshot:

```bash
ls -lah ~/backups/samvio/snapshots/latest/
cd ~/backups/samvio/snapshots/latest
sha256sum -c SHA256SUMS
```

Forventet resultat:

```text
database.sql.gz: OK
uploads.tar.gz: OK
metadata.txt: OK
```

## Automatisk backup

`.github/workflows/backup-production.yml` kobler seg til VPS-en med de samme repository secrets som production-deployen og kjører backup-scriptet som `samvio` én gang per dag. Workflowen kan også startes manuelt fra GitHub Actions.

Dette krever ingen ny SSH-nøkkel, databasebruker, sudoers-regel eller root-innlogging.

## Off-server backup

Lokal backup beskytter mot feil i appen og databasen, men ikke mot tap av hele VPS-en. `backup-production.sh` støtter derfor `REMOTE_DEST` + `rclone` når ekstern lagring velges. Config skal ligge utenfor repoet, for eksempel i `~/.config/rclone/rclone.conf`, og credentials skal aldri committes.

## Restore

Å lage og verifisere backups krever ikke root. En full production-restore er annerledes fordi appen bør stoppes mens database og uploads erstattes. `scripts/restore-production.sh` beholdes derfor som en guarded nødprosedyre og kan kreve root/provider-tilgang eller utvidet, begrenset sudo.

Vi skal ikke gi `samvio` generell root-tilgang bare for å gjøre restore enklere. Før dataene blir kritiske bør ett snapshot restore-testes i et separat testmiljø.
