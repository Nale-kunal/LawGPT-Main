Write-Host "Starting LawyerZen Backend Server..." -ForegroundColor Green
Write-Host ""

# Set environment variables
$env:NODE_ENV = "development"
$env:PORT = "5000"
$env:MONGODB_URI = "mongodb://localhost:27017/lawyer_zen"
$env:JWT_SECRET = "your-super-secret-jwt-key-change-in-production"
$env:CORS_ORIGIN = "http://localhost:8080"

Write-Host "Environment variables set:" -ForegroundColor Yellow
Write-Host "NODE_ENV: $env:NODE_ENV"
Write-Host "PORT: $env:PORT"
Write-Host "MONGODB_URI: $env:MONGODB_URI"
Write-Host "CORS_ORIGIN: $env:CORS_ORIGIN"
Write-Host ""

Write-Host "Starting server on port $env:PORT..." -ForegroundColor Cyan
node index.js

Read-Host -Prompt "Press Enter to exit"
