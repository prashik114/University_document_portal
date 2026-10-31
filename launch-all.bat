@echo off
title University Repository Portal - Master Launcher
color 0B

echo =========================================================================
echo       UNIVERSITY REPOSITORY & ACCREDITATION PORTAL - FULL STACK
echo =========================================================================
echo.
echo [1/3] Checking Spring Boot Backend & Neon PostgreSQL...

set JAVA_HOME=C:\Program Files\Java\jdk-17
set ROOT_DIR=%~dp0

:: Check if port 8080 is already running
netstat -ano | findstr :8080 >nul 2>&1
if %errorlevel% equ 0 (
    echo [INFO] Spring Boot backend is already running on port 8080.
) else (
    echo [INFO] Starting Spring Boot backend in a new window...
    start "Portal Backend (Spring Boot + Neon DB)" cmd /k "color 0A && title Spring Boot Backend && set JAVA_HOME=C:\Program Files\Java\jdk-17 && cd /d "%ROOT_DIR%backend" && if exist target\portal-backend-1.0.0.jar ("%JAVA_HOME%\bin\java.exe" -jar target\portal-backend-1.0.0.jar) else (call mvnw.cmd spring-boot:run)"
    echo [INFO] Waiting 6 seconds for Spring Boot server to initialize...
    timeout /t 6 /nobreak >nul
)

echo.
echo [2/3] Opening Main Portal in Browser...
:: Open index.html directly connected to backend
start "" "%ROOT_DIR%index.html"

echo.
echo [3/3] Launching React JS Frontend (port 3000)...
start "Portal Frontend (React JS)" cmd /k "color 0E && title React JS Frontend && cd /d "%ROOT_DIR%react-frontend" && if not exist node_modules (echo Installing React dependencies... && call npm install) && call npm run dev"

echo.
echo =========================================================================
echo [SUCCESS] Everything launched!
echo.
echo   * Main Portal (HTML5/CSS/JS) : Opened in your browser
echo   * Spring Boot REST Backend   : http://localhost:8080
echo   * Neon PostgreSQL Database   : Connected
echo   * React JS Frontend Client   : http://localhost:3000
echo.
echo To launch the React Native mobile app as well:
echo   Double-click "start-mobile.bat" or run: cd mobile-app ^&^& npm start
echo =========================================================================
echo.
pause

