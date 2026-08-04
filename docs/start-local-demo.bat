@echo off
cd /d "%~dp0"
echo BIMO Fit Challenge lokale demo
echo.
echo Open straks deze URL in je browser:
echo http://127.0.0.1:4173
echo.

where python >nul 2>nul
if %errorlevel%==0 (
  python -m http.server 4173
  goto :eof
)

where py >nul 2>nul
if %errorlevel%==0 (
  py -m http.server 4173
  goto :eof
)

where npx >nul 2>nul
if %errorlevel%==0 (
  npx serve . -l 4173
  goto :eof
)

echo Geen Python of Node gevonden.
echo Installeer Python of upload deze map naar een HTTPS-hosting zoals Netlify, Vercel of GitHub Pages.
pause
