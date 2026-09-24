@echo off
color 0B
title FWMS - API Server (port 4000)
echo.
echo  ==========================================
echo   FWMS API Server
echo   http://localhost:4000
echo   Health: http://localhost:4000/health
echo  ==========================================
echo.
cd /d "C:\Users\Shaikh Nadeem\Downloads\SOET-Paperless-Part1-main\SOET-Paperless-Part1-main\fwms\apps\api"
npx tsx watch src/server.ts
