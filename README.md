# Samvio MVP

SvelteKit-basert lokal MVP med MySQL/MariaDB, Drizzle ORM og utviklingsinnlogging.

## Lokal oppstart

1. Åpne `database/001_initial_schema.sql` i HeidiSQL og kjør hele filen.
2. Kopier `.env.example` til `.env` og legg inn databasebrukeren din:

```env
DATABASE_URL=mysql://samvio_app:passord@127.0.0.1:3306/samvio
AUTH_COOKIE_SECURE=false
```

3. Start appen:

```powershell
npm install
npm run dev
```

Ingen seed- eller dummydata opprettes. Første konto lages på `/login` og er kun for lokal utvikling. `password_hash` fjernes fra den offentlige autentiseringsflyten når BankID/OIDC kobles inn.

## Kontroll

```powershell
npm run check
npm run build
```
