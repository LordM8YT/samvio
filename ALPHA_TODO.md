# Samvio alpha-audit

Baseline 14. august 2026: `npm ci`, `npm run check` og `npm run build` passerer. `npm audit` rapporterer 3 lave og 4 moderate funn som må vurderes kontrollert.

## Kritisk før offentlig alpha

- [x] Erstatt Instagram-lignende layout, kameramerke og story-ringer med egen Samvio-identitet.
- [ ] Del hovedlayout, navigasjon, innlegg og composer i små gjenbrukbare komponenter.
- [x] Legg til migrasjon og backend for `user_feed_state`.
- [x] Vis bare nye innlegg på Hjem og marker ajour først når feed-slutten faktisk er synlig.
- [x] Lag `/historikk` med cursor-paginering for eldre innlegg.
- [x] Implementer eller skjul døde handlinger: liker, kommenter, historie/Nå og «Mer».
- [x] Gjør følg/følgeforespørsel og profiler funksjonelle; dagens søk viser bare resultater.
- [x] Erstatt placeholder-sidene for utforsk, video, meldinger og varsler eller merk dem tydelig som utilgjengelige i alpha.
- [x] Herd innlogging/registrering med rate limits, generisk feil, normalisering og aldersgrense 13 år.
- [x] Lag slett-konto-flyt eller en tydelig alpha-prosess for sletting.
- [x] Lag reelle sider for `/om`, `/personvern`, `/vilkar` og `/hjelp`; juridisk tekst må gjennomgås av menneske.
- [x] Flytt fysisk medielagring bak `src/lib/server/storage.ts` og `UPLOAD_DIR`.
- [x] Bytt til `@sveltejs/adapter-node`; test `node build`.
- [x] Legg til `/healthz` og `/readyz` uten sensitiv informasjon.
- [x] Legg til produksjonsfiler for systemd, Nginx, backup, deploy og status.
- [ ] Test mobil, desktop, feiltilstander, persistent bilde og realistisk alpha-last.

## Observerte svakheter

- Hjem viser døde liker-/kommentarknapper.
- «Historier» ser ferdig ut, men har ingen backend eller handling.
- «Mer», hjelpe-/personvernlenker og flere navigasjonsmål er placeholders.
- Registrering tillater i dag brukere under 13 år og merker dem bare som `child`.
- Ingen rate limiting på login, registrering eller innlegg.
- Feilmeldinger røper forskjellen mellom ugyldige data og utilgjengelig database.
- Uploads bruker repoets `./uploads` direkte.
- `adapter-auto` gir ingen eksplisitt kjørbar Webhuset-target.
- Ingen health checks, deployscript, backupjobb eller produksjonsrunbook.
- Feed har visuell slutt, men ingen vedvarende «Siden sist»-tilstand eller historikk.

## Ikke blokkerende for første alpha

- Minner, full video, meldinger, Nå, avanserte kretser, BankID, Hudd-SSO og Vipps-abonnement.
