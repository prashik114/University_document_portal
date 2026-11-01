@echo off
title University Portal - React Frontend
color 0B
set ROOT_DIR=%~dp0

echo =========================================================================
echo       Starting React Frontend (Vite Dev Server - Port 3000)
echo =========================================================================
echo Root Directory: %ROOT_DIR%
echo URL           : http://localhost:3000
echo Backend Proxy : http://localhost:8080/api
echo.

cd /d "%ROOT_DIR%react-frontend"
if not exist node_modules (
    echo [INFO] Installing NPM dependencies...
    call npm install
)

echo [INFO] Launching Vite development server...
call npm run dev
pause

