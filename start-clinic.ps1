# Starts HAU-Sync on the clinic's server computer: one address for the whole app, reachable
# by the stations on the clinic network. Run it from anywhere; double-click start-clinic.bat.
#
#   .\start-clinic.ps1            start the system
#   .\start-clinic.ps1 -Rebuild   rebuild the screens first (after an update)
#   .\start-clinic.ps1 -Port 80   use another port

param(
    [int]$Port = 8000,
    [switch]$Rebuild
)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$backend = Join-Path $root 'backend'
$frontend = Join-Path $root 'frontend'
$python = Join-Path $backend '.venv\Scripts\python.exe'

function Stop-WithHelp([string]$message) {
    Write-Host ''
    Write-Host "HAU-Sync could not start: $message" -ForegroundColor Red
    Write-Host 'The first-time setup is in backend\BACKEND-README.md, under "Running at the clinic".'
    exit 1
}

# 1. The backend's own Python and packages.
if (-not (Test-Path $python)) {
    if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
        Stop-WithHelp 'Python is not installed on this computer.'
    }
    Write-Host 'Setting up the backend (first run only)...'
    python -m venv (Join-Path $backend '.venv')
    & $python -m pip install --quiet --disable-pip-version-check -r (Join-Path $backend 'requirements.txt')
    if ($LASTEXITCODE -ne 0) { Stop-WithHelp 'the backend packages could not be installed.' }
}

# 2. The settings file holds the secret key, so it is never created with placeholder values.
if (-not (Test-Path (Join-Path $backend '.env'))) {
    Stop-WithHelp 'backend\.env is missing. Copy backend\.env.example to backend\.env, set SECRET_KEY and DEBUG=False.'
}

# 3. The screens, built once into frontend\dist and then served by the backend.
$index = Join-Path $frontend 'dist\index.html'
if ($Rebuild -or -not (Test-Path $index)) {
    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
        Stop-WithHelp 'the screens are not built yet and Node.js is not installed to build them.'
    }
    Write-Host 'Building the screens...'
    Push-Location $frontend
    try {
        if (-not (Test-Path 'node_modules')) { npm install --no-audit --no-fund }
        npm run build
        if ($LASTEXITCODE -ne 0) { Stop-WithHelp 'the screens could not be built.' }
    }
    finally { Pop-Location }
}

Set-Location $backend

# 4. Bring the database up to date. On a new computer this creates the tables.
& $python -m alembic upgrade head
if ($LASTEXITCODE -ne 0) { Stop-WithHelp 'the database could not be prepared.' }

# 5. Say where the stations should point their browsers, then run until the window is closed.
$addresses = @(Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
        Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } |
        ForEach-Object { $_.IPAddress })
$suffix = if ($Port -eq 80) { '' } else { ":$Port" }

Write-Host ''
Write-Host 'HAU-Sync is starting.' -ForegroundColor Green
Write-Host "  On this computer:   http://localhost$suffix"
foreach ($address in $addresses) {
    Write-Host "  From the stations:  http://$address$suffix"
}
Write-Host ''
Write-Host 'Keep this window open while the clinic is using the system. Close it to stop.'
Write-Host ''

& $python -m uvicorn main:app --host 0.0.0.0 --port $Port
