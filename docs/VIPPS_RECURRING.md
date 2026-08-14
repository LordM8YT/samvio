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
```

Produksjon bruker `https://api.vipps.no` etter at Samvio har fått produksjonstilgang.

## Flyt som skal implementeres

1. Brukeren velger abonnement og Samvio oppretter en lokal, ventende bestilling.
2. Serveren henter access token og oppretter en Recurring-avtale med unik idempotensnøkkel.
3. Brukeren sendes til Vipps MobilePay for samtykke.
4. Callback-siden viser kun ventestatus. Serveren bekrefter avtalen ved polling og senere webhook, ikke fra redirect alene.
5. Abonnementet aktiveres først når Vipps rapporterer `ACTIVE`.
6. Alle webhook-hendelser lagres idempotent i `payment_events` før abonnementet oppdateres.
7. Oppsigelse stopper avtalen hos Vipps og beholder tilgang ut betalt periode.

## Før betaling kan slås på

- Vipps Recurring-produkt og testnøkler er mottatt.
- Avtaleoppretting, godkjenning, avvisning og avbrutt kjøp er testet.
- Duplikate webhooks og nettverksfeil er testet.
- Beløp og plan-id valideres på serveren mot `src/lib/plans.ts`.
- Personvern, vilkår, pris og oppsigelse vises før samtykke.
- Produksjonsnøkler ligger i `/etc/samvio/samvio.env`, med begrensede filrettigheter.
- Kjøpsknappene aktiveres først etter en produksjons-sjekkliste og en liten ekte testbetaling.

## Eksisterende fundament

- `subscriptions` lagrer abonnementstilstand.
- `payment_events` brukes til idempotent behandling og revisjonsspor.
- `src/lib/server/vipps/config.ts` validerer påkrevde servervariabler.
- `src/lib/plans.ts` er autoritativ prisliste på serversiden.

Offisiell dokumentasjon:

- https://developer.vippsmobilepay.com/docs/APIs/recurring-api/recurring-api-quick-start/
- https://developer.vippsmobilepay.com/docs/APIs/recurring-api/recurring-api-checklist/
