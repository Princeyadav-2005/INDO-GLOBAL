@echo off
echo ====================================================
echo    FARMER CONNECT 2.0 - Firebase Edition
echo ====================================================
echo.

echo Checking setup...

REM Check for firebase-service-account.json
if not exist "%~dp0server\firebase-service-account.json" (
  echo [ERROR] Firebase service account not found!
  echo.
  echo Setup Steps:
  echo  1. Go to https://console.firebase.google.com
  echo  2. Create or open your project
  echo  3. Project Settings ^> Service Accounts ^> Generate new private key
  echo  4. Save downloaded JSON as:
  echo     %~dp0server\firebase-service-account.json
  echo.
  echo  5. Get a FREE Gemini API key from:
  echo     https://aistudio.google.com/app/apikey
  echo  6. Paste it in: %~dp0server\.env  ^(replace PASTE_YOUR_NEW_GEMINI_KEY_HERE^)
  echo.
  pause
  exit /b
)

echo [OK] Firebase service account found.
echo.

echo [1/2] Starting Backend Server (port 5000)...
start "Farmer Connect - Backend" cmd /k "cd /d "%~dp0server" && node src/app.js"

timeout /t 4 /nobreak >nul

echo [2/2] Starting Frontend Server (port 5173)...
start "Farmer Connect - Frontend" cmd /k "cd /d "%~dp0client" && npm run dev"

timeout /t 5 /nobreak >nul

echo.
echo ====================================================
echo  Servers started!
echo  Backend:  http://localhost:5000
echo  Frontend: http://localhost:5173
echo ====================================================
echo.
start "" "http://localhost:5173"
pause
