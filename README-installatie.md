# BIMO Fit Challenge App

Installable PWA voor Android en iOS met:

- registratie van nieuwe leden
- persoonlijke QR-code per member
- admin QR-check-in voor aanwezigheid
- scanbewijs zichtbaar voor member
- BMI-berekening
- automatisch trainingsschema
- admin-only punten voor betaling, aanwezigheid, progressie, gezondheid, events en referrals
- maandelijkse challenges
- ranking van deelnemers
- beloningen: korting abonnement, waardebonnen en merchandise

## Snel testen op laptop

Windows: dubbelklik op `start-local-demo.bat`.

Of open een terminal in deze map en start een lokale server:

```powershell
npx serve .
```

Open daarna de getoonde `http://localhost:...` URL in Chrome, Edge of Safari.

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

De admin PIN in deze afstudeer-demo is `2468`. In een echte productie-app hoort adminbeveiliging op een backend/server te staan.

## Gebruikte BIMO-bronnen

Logo, trainingsbeelden en merkcontent zijn gebaseerd op de publieke BIMO Athletics website:

- https://bimoathletics.com/
- https://bimoathletics.com/about-us/
- https://bimoathletics.com/training-programs/
