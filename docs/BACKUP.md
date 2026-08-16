# Samvio backup og restore

Dette oppsettet lager ett verifisert production-snapshot som inneholder både MariaDB og uploads.

Standard:

- snapshots: `/var/backups/samvio/snapshots/<UTC-timestamp>/`
- database: `database.sql.gz`
- uploads: `uploads.tar.gz`
- metadata: `metadata.txt`
- checksums: `SHA256SUMS`
- lokal retention: 14 dager
- systemd timer: daglig rundt 03:15, med opptil 15 minutter randomisert forsinkelse

Backup-scriptet tester gzip/tar og SHA-256 før snapshotet markeres som ferdig.

## 1. Dedikert databasebruker for backup

Backup-brukeren skal være read-only. Kjør som MariaDB-administrator:

```sql
CREATE USER 'samvio_backup'@'localhost' IDENTIFIED BY 'BRUK_ET_LANGT_TILFELDIG_PASSORD';
GRANT SELECT, SHOW VIEW, TRIGGER ON samvio.* TO 'samvio_backup'@'localhost';
FLUSH PRIVILEGES;
```

Opprett deretter `/etc/samvio/mysql-backup.cnf` som root:

```ini
[client]
user=samvio_backup
password=BRUK_ET_LANGT_TILFELDIG_PASSORD
host=localhost
```

Sett sikre rettigheter:

```bash
chown root:root /etc/samvio/mysql-backup.cnf
chmod 600 /etc/samvio/mysql-backup.cnf
```

Ikke legg denne filen eller passordet i GitHub.

## 2. Installer timeren

Etter at backup-endringene er deployet til `/opt/samvio/app`:

```bash
cd /opt/samvio/app
sudo bash scripts/install-backup-timer.sh
```

Installer-scriptet kopierer systemd-unitene, aktiverer timeren og kjører en første backup med en gang.

Sjekk status:

```bash
sudo systemctl status samvio-backup.service
sudo systemctl list-timers samvio-backup.timer
sudo journalctl -u samvio-backup.service -n 100 --no-pager
```

Se snapshots:

```bash
sudo ls -lah /var/backups/samvio/snapshots/
sudo ls -lah /var/backups/samvio/snapshots/latest/
```

## 3. Manuell backup

```bash
cd /opt/samvio/app
sudo bash scripts/backup-production.sh
```

## 4. Restore-test / production restore

Restore er bevisst vanskelig å kjøre ved et uhell. Scriptet:

1. verifiserer checksums og arkiver,
2. tar en ny safety-backup av dagens production,
3. stopper `samvio.service`,
4. gjenoppretter database og uploads,
5. starter Samvio igjen,
6. krever grønn `/healthz` før restore regnes som vellykket.

Restore bruker **ikke** den read-only backup-brukeren. Når scriptet kjøres som root prøver det først MariaDBs lokale root/socket-auth. På standard Ubuntu/MariaDB er dette normalt nok.

Test tilgang uten å endre data:

```bash
sudo mariadb samvio -Nse 'SELECT 1'
```

Hvis dette ikke fungerer, opprett en separat root-eid `/etc/samvio/mysql-restore.cnf` med en databasebruker som har nødvendige rettigheter til å opprette, endre, slette og skrive tabeller i `samvio`. Filen skal ha `0600` og aldri committes til GitHub. Restore-scriptet bruker denne automatisk hvis filen finnes.

Kjør restore:

```bash
cd /opt/samvio/app
sudo bash scripts/restore-production.sh /var/backups/samvio/snapshots/<timestamp> --confirm
```

Hvis safety-backup ikke kan tas fordi nåværende database er ødelagt, kan den hoppes over eksplisitt:

```bash
sudo bash scripts/restore-production.sh /var/backups/samvio/snapshots/<timestamp> --confirm --skip-safety-backup
```

Ved restore-feil stoppes appen slik at den ikke kjører med delvis gjenopprettede data.

## 5. Off-server backup

Backup på samme VPS beskytter mot app-/databasefeil, men ikke mot tap av hele VPS-en. `backup-production.sh` støtter derfor valgfri `rclone`-kopi.

Når en ekstern lagringsleverandør er valgt:

1. installer `rclone`,
2. lag en root-eid config utenfor repoet, anbefalt `/etc/samvio/rclone.conf`,
3. sett `RCLONE_CONFIG=/etc/samvio/rclone.conf` og `REMOTE_DEST=<remote>:<mappe>` i `/etc/samvio/backup.env`,
4. kjør en manuell backup og bekreft at snapshotet finnes eksternt.

Eksempel:

```ini
REMOTE_DEST=b2:samvio-production
RCLONE_CONFIG=/etc/samvio/rclone.conf
```

Credentials og remote-config skal aldri committes til repoet.

## Restore-øvelse

Minst én gang før alpha-data blir viktige bør et snapshot restore-testes i et separat testmiljø. En backup er ikke verifisert i praksis før den faktisk har blitt gjenopprettet.
