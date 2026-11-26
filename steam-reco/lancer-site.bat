@echo off
REM ==========================================================
REM  Lance le site Steam Reco : double-clic sur ce fichier.
REM  Pour arreter le serveur : fermer cette fenetre (ou Ctrl + C).
REM ==========================================================
title Steam Reco - serveur
REM on se place dans le dossier du fichier .bat
cd /d "%~dp0"

REM Node.js est-il installe ?
where node >/dev/null 2>nul
if errorlevel 1 (
  echo Node.js n'est pas installe. Telecharge-le sur https://nodejs.org puis relance ce fichier.
  pause
  exit /b 1
)

REM Premiere fois : on installe les librairies (express, chart.js)
if not exist "node_modules" (
  echo Installation des librairies, patiente un peu...
  call npm install
)

REM On ouvre le site dans le navigateur 3 secondes apres le demarrage
start "" cmd /c "timeout /t 3 >/dev/null & start http://localhost:3000"

echo Lancement du serveur sur http://localhost:3000
call npm start
pause
