@echo off
color 0E
title FWMS - Web App (port 3000)
echo.
echo  ==========================================
echo   FWMS Web App
echo   http://localhost:3000
echo  ==========================================
echo.
cd /d "D:\Paperless SOET\fwms\apps\web"
npx next dev
