@echo off
title QualiPilot
cd /d "c:\_git\QualiPilot"
echo Demarrage de QualiPilot...
start "QualiPilot - Serveurs" cmd /k "npm run dev"
timeout /t 8 /nobreak > nul
start "" "http://localhost:5173"
