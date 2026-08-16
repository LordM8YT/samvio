# Vipps MobilePay Recurring

Samvio skal bruke Recurring API v3 for betalte månedsabonnementer. Kjøpsknappene skal være deaktivert til testmiljøet har bestått hele flyten nedenfor.

## Påkrevd konfigurasjon

Følgende hemmeligheter legges kun i servermiljøet, aldri i Git:

```env
VIPPS_API_BASE_URL=https://apitest.vipps.no
VIPPS_CLIENT_ID=
VIPPS_CLIENT_SECRET=
VIPPS_SUBSCRIPTION_KEY=
VIPPS_MERCHANT_SERIAL_NUMBER=
VIPPS_SYSTEM_NAME=Samvio
VIPPS_SYSTEM_VERSION=0.1.0
VIPPS_PAYMENTS_ENABLED=false
```

Produksjon bruker `https://api.vipps.no` etter at Samvio har fått produksjonstilgang.

## Nåværende betalingsmodell

- `Person` er den eneste planen som kan gjøres kjøpbar i første betalings-test.
- `Familie` vises i prislisten, men kan ikke kjøpes før familiealbum, familieadministrasjon og foresattverktøy er ferdige.
- Avtalen opprettes med en `DIRECT_CAPTURE` initial charge tilsvarende første månedspris.
- Samvio gir **aldri** premiumrettigheter bare fordi en Vipps-avtale finnes. Det må finnes en lokal betalt periode (`current_period_end` i fremtiden).
- Når en avtale med initial charge blir `ACTIVE`, opprettes første betalte periode på én måned.
- Når den betalte perioden utløper uten bekreftet fornyelse, faller rettighetene automatisk tilbake til Gratis.

Dette hindrer at en godkjent, men ubetalt avtale gir premiumtilgang.

## Entitlements

`src/lib/server/subscriptions.ts` er eneste autoritative sted for produktrettigheter.

Gratis:
- optimalisert bildekvalitet
- 1 GB lagring for innlegg
- historikk siste 12 måneder

Person:
- original bildekvalitet
- 5 GB lagring for innlegg
- hele det private arkivet

Familie arver Person-rettighetene, men planen skal ikke kunne kjøpes før de familiespesifikke funksjonene er implementert.

## Flyt som skal ferdigstilles før produksjonsbetaling

1. Brukeren velger abonnement og Samvio oppretter en lokal, ventende bestilling.
2. Serveren henter access token og oppretter en Recurring-avtale med unik idempotensnøkkel og initial charge.
3. Brukeren sendes til Vipps MobilePay for samtykke og første betaling.
4. Redirect kan brukes til polling som fallback, men skal ikke være eneste kilde til sannhet.
5. Agreement-webhooks (`activated`, `rejected`, `stopped`, `expired`) skal valideres med Vipps HMAC og behandles idempotent.
6. Charge-webhooks skal brukes til å starte/forlenge betalte perioder først når betaling er bekreftet.
7. Alle webhook-hendelser lagres idempotent i `payment_events` før abonnementet oppdateres.
8. Månedlige charges må planlegges etter Vipps-reglene, med minst to retry-dager når det er relevant.
9. Oppsigelse stopper fremtidige trekk og beholder tilgang ut allerede betalt periode.

## Før `VIPPS_PAYMENTS_ENABLED=true`

- Vipps Recurring-produkt og testnøkler er mottatt.
- Agreement-webhooks er registrert og HMAC-validering er testet.
- Charge-webhooks og fornyelsesjobb er implementert.
- Avtaleoppretting, initial betaling, godkjenning, avvisning og avbrutt kjøp er testet.
- Duplikate webhooks og nettverksfeil er testet.
- Beløp og plan-id valideres på serveren mot `src/lib/plans.ts`.
- Person-rettigheter slås på ved bekreftet betaling og av ved utløpt betalt periode.
- Familie kan ikke kjøpes før alle annonserte familie-funksjoner finnes.
- Personvern, vilkår, pris og oppsigelse vises før samtykke.
- Produksjonsnøkler ligger i `/etc/samvio/samvio.env`, med begrensede filrettigheter.
- Kjøpsknappene aktiveres først etter en produksjons-sjekkliste og en liten ekte testbetaling.

## Eksisterende fundament

- `subscriptions` lagrer abonnementstilstand og betalt periode.
- `payment_events` er klargjort for idempotent behandling og revisjonsspor.
- `src/lib/server/subscriptions.ts` avgjør hvilke produktrettigheter brukeren har.
- `src/lib/server/vipps/config.ts` validerer påkrevde servervariabler.
- `src/lib/plans.ts` er autoritativ prisliste på serversiden.

Offisiell dokumentasjon:

- https://developer.vippsmobilepay.com/docs/APIs/recurring-api/recurring-api-quick-start/
- https://developer.vippsmobilepay.com/docs/APIs/recurring-api/recurring-api-checklist/
- https://developer.vippsmobilepay.com/docs/APIs/webhooks-api/events/
- https://developer.vippsmobilepay.com/docs/APIs/webhooks-api/request-authentication/
