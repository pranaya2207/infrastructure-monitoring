@echo off
title AI Project Monitoring & Risk Prediction Platform
echo =========================================================================
echo Starting AI Project Monitoring & Risk Prediction Platform...
echo =========================================================================
echo.

:: Start Flask web application in the background
start "ProjectGuard Server" /min python app.py

:: Wait 2 seconds for server to bind port 5000
timeout /t 2 /nobreak >nul

echo.
echo Launching Public HTTPS Tunnel...
echo Anyone in the world can access the URL printed below!
echo.
.\cloudflared.exe tunnel --url http://127.0.0.1:5000

pause
