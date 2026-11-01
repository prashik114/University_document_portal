# PowerShell launcher for React Frontend
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host " Starting React Frontend (Vite Dev Server - Port 3000)" -ForegroundColor Cyan
Write-Host "=========================================================" -ForegroundColor Cyan

Set-Location "$PSScriptRoot\react-frontend"

if (-not (Test-Path "node_modules")) {
    Write-Host "[INFO] Installing dependencies..." -ForegroundColor Yellow
    npm install
}

Write-Host "Dev Server: http://localhost:3000" -ForegroundColor Green
npm run dev
