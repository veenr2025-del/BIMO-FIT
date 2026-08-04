# Supabase online zetten

Deze app werkt lokaal zonder database, maar met Supabase worden leden, QR-scans, punten, challenges en rewards online opgeslagen.

## 1. Database maken

1. Open jouw Supabase project.
2. Ga naar `SQL Editor`.
3. Open het bestand `supabase-schema.sql` uit deze map.
4. Plak alles in Supabase.
5. Klik op `Run`.

## 2. Membercodes toevoegen

1. Open het privebestand `private/supabase-member-codes-insert.sql`.
2. Plak de inhoud in Supabase `SQL Editor`.
3. Klik op `Run`.
4. Geef daarna per lid 1 code uit `private/bimo-member-codes-100.csv`.

Zet deze codebestanden niet openbaar op GitHub. Dit zijn inlogcodes.

## 3. Publieke key controleren

1. Ga in Supabase naar `Project Settings`.
2. Open `API`.
3. Kopieer de volledige `Publishable key`.
4. Open `supabase-config.js`.
5. Zet de key bij `publishableKey`.

Gebruik nooit `service_role`, `sb_secret_...` of database-wachtwoorden in GitHub.

## 4. GitHub Pages uploaden

Upload de volledige inhoud van deze map naar de root van je repository of naar `/docs`.

Voor `/docs`:

1. Maak in GitHub een map `docs`.
2. Upload alle bestanden uit deze map in `docs`.
3. Ga naar `Settings` > `Pages`.
4. Kies `Deploy from a branch`.
5. Kies branch `main` en folder `/docs`.
6. Klik `Save`.

Na 1 tot 3 minuten krijg je een online link. Open die link op Android of iPhone en voeg de app toe aan het beginscherm.

## Belangrijk

Dit is een gratis GitHub Pages/Supabase opstelling. De app heeft RLS aan staan, maar de hoofdtabellen hebben brede policies zodat een statische PWA zonder eigen server kan opslaan.

Voor een echte sportschoolversie moet de admin-login via Supabase Auth of een backend werken. Zet dan admin-acties achter echte gebruikersrollen in plaats van alleen de demo PIN.
