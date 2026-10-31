@echo off
title University Repository - Spring Boot Backend
color 0A
set JAVA_HOME=C:\Program Files\Java\jdk-17
set ROOT_DIR=%~dp0

echo =========================================================================
echo       Starting Spring Boot Backend on Port 8080 (Neon PostgreSQL)
echo =========================================================================
cd /d "%ROOT_DIR%backend"
if exist target\portal-backend-1.0.0.jar (
    "%JAVA_HOME%\bin\java.exe" -jar target\portal-backend-1.0.0.jar
) else (
    call mvnw.cmd clean package -DskipTests
    "%JAVA_HOME%\bin\java.exe" -jar target\portal-backend-1.0.0.jar
)
pause

