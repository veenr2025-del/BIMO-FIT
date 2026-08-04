# BIMO Fit Challenge App

Installable PWA voor Android en iOS met:

- registratie van nieuwe leden
- persoonlijke QR-code per member
- admin QR-check-in voor aanwezigheid via camera of handmatige scan
- scanbewijs zichtbaar voor member
- BMI-berekening
- automatisch trainingsschema
- admin-only punten voor betaling, aanwezigheid, progressie, gezondheid, events en referrals
- maandelijkse challenges
- ranking van deelnemers
- beloningen: korting abonnement, waardebonnen en merchandise
- Supabase online opslag met lokale fallback

## Member account maken

1. Open de app.
2. Tik op `Profiel`.
3. Vul naam, lengte, gewicht, doel en programma in.
4. Tik op `Member account opslaan`.
5. De member krijgt direct een QR-pas.

De QR-pas kan daarna door admin worden gescand vanaf een andere telefoon.

## Admin camera scan

1. Tik op `Admin`.
2. Log in met PIN `2468`.
3. Tik op `Scan met camera`.
4. Sta camera-toegang toe.
5. Richt de camera op de QR-code van de member.

Wanneer de QR-code gelezen is, wordt de check-in automatisch in Supabase opgeslagen.

## Snel testen op laptop

Windows: dubbelklik op `start-local-demo.bat`.

Of open een terminal in deze map en start een lokale server:

```powershell
npx serve .
```

Open daarna de getoonde `http://localhost:...` URL in Chrome, Edge of Safari.

## Supabase koppelen

1. Open `supabase-schema.sql`.
2. Plak de inhoud in Supabase `SQL Editor` en klik `Run`.
3. Controleer `supabase-config.js`.
4. Zet daar jouw volledige `Publishable key` in.

De project URL staat al ingevuld:

```text
https://uafaitdzzhfzsjwyjulf.supabase.co
```

Gebruik alleen een key die begint met `sb_publishable_`. Gebruik nooit een `sb_secret_`, `service_role` key of database-wachtwoord in GitHub.

## Installeren op Android

Voor echte telefooninstallatie moet de map via een HTTPS-url bereikbaar zijn, bijvoorbeeld via Netlify, Vercel, GitHub Pages of de schoolserver.

1. Upload de volledige map `bimo-fit-challenge`.
2. Open de HTTPS-url in Chrome op Android.
3. Kies `Installeer app` of gebruik het Chrome-menu en kies `Toevoegen aan startscherm`.
4. De app opent daarna als standalone app met eigen icoon.

## Installeren op iPhone

1. Open de HTTPS-url in Safari.
2. Tik op `Delen`.
3. Kies `Zet op beginscherm`.
4. Bevestig de naam `BIMO Fit`.

## Belangrijk

PWA-installatie en offline caching werken niet volledig wanneer je alleen dubbelklikt op `index.html`. Gebruik voor demonstratie minimaal een lokale server en voor telefoons een HTTPS-hostinglink.

De admin PIN in deze afstudeer-demo is `2468`. In een echte productie-app hoort adminbeveiliging via Supabase Auth of een backend/server te staan.

Wanneer Supabase nog niet goed staat, zie je in de app `Lokale demo` of `Supabase aandacht nodig`. De app blijft dan werken, maar slaat alleen op het toestel op.

## Gebruikte BIMO-bronnen

Logo, trainingsbeelden en merkcontent zijn gebaseerd op de publieke BIMO Athletics website:

- https://bimoathletics.com/
- https://bimoathletics.com/about-us/
- https://bimoathletics.com/training-programs/

QR-camera fallback gebruikt `jsQR`:

- https://github.com/cozmo/jsQR
