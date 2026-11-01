@echo off
title University Portal - Spring Boot Backend
color 0A
set ROOT_DIR=%~dp0

:: Detect JAVA_HOME if not already in environment
if "%JAVA_HOME%"=="" (
    if exist "C:\Program Files\Java\jdk-17" (
        set "JAVA_HOME=C:\Program Files\Java\jdk-17"
    )
)

echo =========================================================================
echo       Starting Spring Boot Backend (Port 8080)
echo =========================================================================
echo Root Directory: %ROOT_DIR%
echo Java Home     : %JAVA_HOME%
echo Endpoint      : http://localhost:8080/api/health
echo.

cd /d "%ROOT_DIR%backend"
if exist target\portal-backend-1.0.0.jar (
    "%JAVA_HOME%\bin\java.exe" -jar target\portal-backend-1.0.0.jar
) else (
    echo [INFO] Jar not found, compiling with Maven...
    call mvnw.cmd clean package -DskipTests
    "%JAVA_HOME%\bin\java.exe" -jar target\portal-backend-1.0.0.jar
)
pause
