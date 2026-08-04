# GitHub Pages deploy stappen

Gebruik bij voorkeur deze zip:

```text
github-pages-docs-supabase.zip
```

## Stap 1: zip uitpakken

Pak `github-pages-docs-supabase.zip` uit. Je krijgt een map:

```text
docs
```

In die map moet direct `index.html` staan.

## Stap 2: upload naar GitHub

1. Open jouw GitHub repository.
2. Klik op `Add file`.
3. Kies `Upload files`.
4. Sleep de volledige map `docs` naar GitHub.
5. Klik op `Commit changes`.

## Stap 3: Pages aanzetten

1. Ga naar `Settings`.
2. Klik links op `Pages`.
3. Bij `Source`, kies `Deploy from a branch`.
4. Bij `Branch`, kies `main`.
5. Bij folder, kies `/docs`.
6. Klik op `Save`.

## Stap 4: wachten

Wacht 1 tot 3 minuten. GitHub toont daarna jouw Pages-link.

Als je weer een 404 krijgt, controleer dan:

- staat `index.html` echt in `docs/index.html`
- staat Pages op branch `main`
- staat folder op `/docs`
- heb je op `Save` geklikt

## Stap 5: installeren op telefoon

Android:

1. Open de GitHub Pages-link in Chrome.
2. Tik op menu.
3. Kies `Toevoegen aan startscherm` of `Installeer app`.

iPhone:

1. Open de GitHub Pages-link in Safari.
2. Tik op delen.
3. Kies `Zet op beginscherm`.
