@echo off
title University Document Portal - Mobile App (React Native)
color 0D

echo ========================================================
echo Starting University Document Portal - React Native App
echo ========================================================
cd /d "%~dp0mobile-app"

if not exist node_modules (
    echo Installing React Native & Expo packages...
    call npm install
)

echo Starting Expo Metro Bundler...
call npx expo start
pause

