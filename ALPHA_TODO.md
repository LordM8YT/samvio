# Samvio alpha-audit

Baseline 17. august 2026: `npm ci`, `npm run check` og `npm run build` passerer. `npm audit` rapporterer 3 lave og 4 moderate funn som må vurderes kontrollert.

## Kritisk før offentlig alpha

- [x] Erstatt Instagram-lignende layout, kameramerke og story-ringer med egen Samvio-identitet.
- [ ] Del hovedlayout, navigasjon, innlegg og composer i små gjenbrukbare komponenter.
- [x] Legg til migrasjon og backend for `user_feed_state`.
- [x] Vis bare nye innlegg på Hjem og marker ajour først når feed-slutten faktisk er synlig.
- [x] Lag `/historikk` med cursor-paginering for eldre innlegg.
- [x] Implementer eller skjul døde handlinger: liker, kommenter, historie/Nå og «Mer».
- [x] Gjør følg/følgeforespørsel og profiler funksjonelle.
- [x] Erstatt placeholder-sidene for utforsk, video, meldinger og varsler eller merk dem tydelig som utilgjengelige i alpha.
- [x] Herd innlogging/registrering med rate limits, generisk feil, normalisering og aldersgrense 13 år.
- [x] Lag slett-konto-flyt.
- [x] Lag reelle sider for `/om`, `/personvern`, `/vilkar` og `/hjelp`; juridisk tekst må gjennomgås av menneske.
- [x] Flytt fysisk medielagring bak `src/lib/server/storage.ts` og `UPLOAD_DIR`.
- [x] Bytt til `@sveltejs/adapter-node`; test `node build`.
- [x] Legg til `/healthz` og `/readyz` uten sensitiv informasjon.
- [x] Legg til produksjonsfiler for systemd, Nginx, backup, deploy og status.
- [x] Legg til lokal, verifisert daglig production-backup med retention.
- [x] Legg til grunnleggende request-id og strukturert serverfeillogging.
- [ ] Test mobil, desktop, feiltilstander, persistent bilde og realistisk alpha-last.
- [ ] Vurder og oppgrader dependency-funn kontrollert; ikke bruk `npm audit fix --force` blindt.

## Public alpha gate – før ekte brukere inviteres

Dette er en bevisst sperre. Intern testing kan leve med høyere risiko, men ekte brukerdata skal ikke være avhengig av én VPS.

- [ ] Konfigurer off-server backup (`REMOTE_DEST`) hos en separat lagringsleverandør.
- [ ] Gjennomfør og dokumenter en full restore-test fra backup.
- [ ] Varsle når backupjobb eller restore-verifisering feiler.
- [ ] Test hele hovedflyten: registrering → onboarding → følge → poste → kommentere → varsler → innstillinger → kontosletting.
- [ ] Test med kontrollert alpha-last og feilinjeksjon for database/lagring.
- [ ] Ha en tydelig rutine for å finne og følge opp production `server_error`/request-id.
- [ ] Gjennomgå personvern/vilkår og databehandling før offentlig invitasjon.

## Kjente tekniske forbedringer

- Svelte-warninger bør reduseres slik at nye warnings blir signal, ikke bakgrunnsstøy.
- Media-cleanup må være observerbar slik at mislykket fysisk filsletting ikke blir usynlig.
- Off-server backup er fortsatt den viktigste datatapssperren før offentlig alpha.
- Production-deploy er automatisk etter grønn `Validate`, men har ikke transaksjonell rollback.

## Ikke blokkerende for første alpha

- Minner utover dagens grunnfunksjon, full video, meldinger, Nå, avanserte kretser, BankID, Hudd-SSO og full Vipps-abonnementsflyt.
- Mobilapp/App Store/Google Play kan komme etter at web-alphaen er robust.
