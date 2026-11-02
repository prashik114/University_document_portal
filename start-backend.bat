@echo off
echo Starting University Document Portal Backend...
echo Backend will be available at: http://localhost:8080
echo.
set "JAVA_HOME=C:\Program Files\Java\jdk-17"
cd /d "%~dp0backend"
call mvnw.cmd spring-boot:run
pause
