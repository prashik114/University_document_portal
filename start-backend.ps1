# University Document Portal — Backend Launcher
$env:JAVA_HOME = "C:\Program Files\Java\jdk-17"
Write-Host "Starting backend on http://localhost:8080 ..." -ForegroundColor Cyan
Set-Location "$PSScriptRoot\backend"
.\mvnw.cmd spring-boot:run
