@echo off
setlocal enabledelayedexpansion

:: ============================================================
:: FWMS - Faculty Workload Management System
:: Campus-Wide Paperless System Launcher
:: ============================================================

title FWMS Launcher
color 0A

echo.
echo  ============================================================
echo   FWMS -- Faculty Workload Management System
echo   Campus-Wide Paperless System Launcher
echo  ============================================================
echo.

:: Step 1: Check Node.js
echo [1/5] Checking Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo  [ERROR] Node.js is NOT installed or not in PATH.
    echo  Please install Node.js v20+ from https://nodejs.org
    echo.
    pause
    exit /b 1
)

for /f "tokens=1 delims=." %%a in ('node -v') do set "NODE_MAJOR=%%a"
set "NODE_MAJOR=!NODE_MAJOR:v=!"
if !NODE_MAJOR! LSS 20 (
    color 0C
    echo  [ERROR] Node.js v!NODE_MAJOR! detected. v20+ is required.
    echo  Please upgrade from https://nodejs.org
    pause
    exit /b 1
)
echo  [OK] Node.js v!NODE_MAJOR!.x detected.

:: Step 2: Set project path
set "PROJECT_DIR=%~dp0fwms"
echo.
echo [2/5] Project directory: !PROJECT_DIR!

if not exist "!PROJECT_DIR!\package.json" (
    color 0C
    echo  [ERROR] Cannot find fwms\package.json
    echo  Make sure start.bat is inside the "Paperless SOET" folder.
    pause
    exit /b 1
)

:: Step 3: Install dependencies
echo.
echo [3/5] Checking / installing dependencies...
cd /d "!PROJECT_DIR!"

if not exist "node_modules" (
    echo  Installing root workspace dependencies...
    call npm install
) else (
    echo  [OK] Root node_modules found.
)

if not exist "apps\api\node_modules" (
    echo  Installing API dependencies...
    cd /d "!PROJECT_DIR!\apps\api"
    call npm install
    cd /d "!PROJECT_DIR!"
) else (
    echo  [OK] API node_modules found.
)

if not exist "apps\web\node_modules" (
    echo  Installing Web dependencies...
    cd /d "!PROJECT_DIR!\apps\web"
    call npm install
    cd /d "!PROJECT_DIR!"
) else (
    echo  [OK] Web node_modules found.
)

:: Step 4: Prisma database setup
echo.
echo [4/5] Setting up database ^(Prisma + SQLite^)...
cd /d "!PROJECT_DIR!\apps\api"

echo  Generating Prisma client...
call npx prisma generate --schema=prisma/schema.prisma
echo  [OK] Prisma client ready.

echo  Pushing schema to SQLite database...
call npx prisma db push --schema=prisma/schema.prisma --skip-generate --accept-data-loss
echo  [OK] Database schema synced.

if not exist "prisma\dev.db" (
    echo  Seeding initial data...
    call npx tsx prisma/seed.ts
    echo  [OK] Database seeded.
) else (
    echo  [OK] Existing database found -- skipping seed.
)

cd /d "!PROJECT_DIR!"

:: Step 5: Launch both servers in separate windows
echo.
echo [5/5] Launching servers...
echo.

:: Create a small helper script for the API window
set "API_SCRIPT=!PROJECT_DIR!\apps\api\run_dev.bat"
(
    echo @echo off
    echo color 0B
    echo title FWMS - API Server ^(port 4000^)
    echo echo.
    echo echo  ==========================================
    echo echo   FWMS API Server
    echo echo   http://localhost:4000
    echo echo   Health: http://localhost:4000/health
    echo echo  ==========================================
    echo echo.
    echo cd /d "!PROJECT_DIR!\apps\api"
    echo npx tsx watch src/server.ts
) > "!API_SCRIPT!"

:: Create a small helper script for the Web window
set "WEB_SCRIPT=!PROJECT_DIR!\apps\web\run_dev.bat"
(
    echo @echo off
    echo color 0E
    echo title FWMS - Web App ^(port 3000^)
    echo echo.
    echo echo  ==========================================
    echo echo   FWMS Web App
    echo echo   http://localhost:3000
    echo echo  ==========================================
    echo echo.
    echo cd /d "!PROJECT_DIR!\apps\web"
    echo npx next dev
) > "!WEB_SCRIPT!"

echo  Starting API Server  ^(http://localhost:4000^)...
start "FWMS - API :4000" cmd /k "!API_SCRIPT!"

timeout /t 3 /nobreak >nul

echo  Starting Web App     ^(http://localhost:3000^)...
start "FWMS - Web :3000" cmd /k "!WEB_SCRIPT!"

echo.
echo  ============================================================
echo   Both servers are starting in separate windows!
echo.
echo    Web App  --^>  http://localhost:3000
echo    API      --^>  http://localhost:4000
echo    Health   --^>  http://localhost:4000/health
echo.
echo    To STOP: close the server windows or press Ctrl+C in them.
echo  ============================================================
echo.

timeout /t 5 /nobreak >nul
start "" "http://localhost:3000"

echo  Browser opened. This window can now be closed safely.
echo.
pause
endlocal
