@echo off
echo Starting University Document Portal Frontend...
echo Frontend will be available at: http://localhost:3000
echo Ensure the backend is running on http://localhost:8080 first.
echo.
cd /d "%~dp0react-frontend"
call npm run dev
pause
