# BIMO Fit Challenge App

Installable PWA voor Android en iOS met:

- registratie/inloggen met 4-cijfer membercode
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

## Member account maken met 4-cijfer code

1. Open de app.
2. Tik op `Account` of gebruik het codeformulier op `Home`.
3. Vul de 4-cijfer code in die BIMO aan het lid geeft.
4. Tik op `Inloggen / account starten`.
5. Bij een nieuwe code vult het lid naam, lengte, gewicht, doel en programma in.
6. Tik op `Profiel en QR opslaan`.
7. De member krijgt direct een QR-pas.

De QR-pas is gekoppeld aan de membercode. Als het lid later opnieuw inlogt met dezelfde code, worden profiel, punten, QR-scans, rewards en challenges opnieuw uit Supabase geladen.

## Admin camera scan

1. Tik op `Admin`.
2. Log in met PIN `2468`.
3. Tik op `Scan met camera`.
4. Sta camera-toegang toe.
5. Richt de camera op de QR-code van de member.

Wanneer de QR-code gelezen is, wordt de check-in automatisch in Supabase opgeslagen.

Let op: geef membercodes alleen aan echte leden. Een 4-cijfer code is makkelijk voor de balie en voor leden, maar minder sterk dan een volledige accountlogin.

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
3. Plak daarna de prive SQL met membercodes in Supabase en klik `Run`.
4. Controleer `supabase-config.js`.
5. Zet daar jouw volledige `Publishable key` in.

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

De admin PIN is `2468`. Voor zwaardere productiebeveiliging hoort adminbeveiliging via Supabase Auth, extra rollen of een backend/server te staan.

Wanneer Supabase nog niet goed staat, zie je in de app `Lokale demo` of `Supabase aandacht nodig`. De app blijft dan werken, maar slaat alleen op het toestel op.

## Gebruikte BIMO-bronnen

Logo, trainingsbeelden en merkcontent zijn gebaseerd op de publieke BIMO Athletics website:

- https://bimoathletics.com/
- https://bimoathletics.com/about-us/
- https://bimoathletics.com/training-programs/

QR-camera fallback gebruikt `jsQR`:

- https://github.com/cozmo/jsQR
