# Skill Manager Launcher
# Scan skills/rules and start a local HTTP server

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Skill Manager" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$scriptDir = $PSScriptRoot

# Step 1: Run scan
Write-Host "[1/2] Scanning Skills and Rules..." -ForegroundColor Yellow
& "$scriptDir\scan.ps1"

# Step 2: Start HTTP server and open browser
Write-Host ""
Write-Host "[2/2] Starting local server..." -ForegroundColor Yellow

$port = 8765
$url = "http://localhost:$port"

Write-Host ""
Write-Host "Opening: $url" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Gray
Write-Host ""

# Open browser
Start-Process $url

# Start Python HTTP server
Set-Location $scriptDir
python -m http.server $port
