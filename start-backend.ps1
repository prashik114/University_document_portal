# PowerShell launcher for Spring Boot Backend
Write-Host "=========================================================" -ForegroundColor Green
Write-Host " Starting Spring Boot Backend (Port: 8080)" -ForegroundColor Green
Write-Host "=========================================================" -ForegroundColor Green

if (-not $env:JAVA_HOME) {
    if (Test-Path "C:\Program Files\Java\jdk-17") {
        $env:JAVA_HOME = "C:\Program Files\Java\jdk-17"
    }
}

Write-Host "JAVA_HOME: $env:JAVA_HOME" -ForegroundColor Gray
Set-Location "$PSScriptRoot\backend"

if (Test-Path "target\portal-backend-1.0.0.jar") {
    & "$env:JAVA_HOME\bin\java.exe" -jar target\portal-backend-1.0.0.jar
} else {
    .\mvnw.cmd clean package -DskipTests
    & "$env:JAVA_HOME\bin\java.exe" -jar target\portal-backend-1.0.0.jar
}

