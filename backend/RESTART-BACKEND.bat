@echo off
echo ========================================
echo RESTARTING BACKEND WITH FIXES
echo ========================================
echo.
echo Stopping any running Node processes...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul
echo.
echo Starting backend server...
cd /d "%~dp0"
npm run dev
