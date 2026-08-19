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
cd /d "D:\Paperless SOET\fwms\apps\api"
npx tsx watch src/server.ts
