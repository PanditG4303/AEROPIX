#Requires -Version 5.1
<#
.SYNOPSIS
    One-time local setup for AEROPIX on Windows (no AWS account required).

.DESCRIPTION
    Creates a Python virtual environment, installs backend and frontend
    dependencies, writes a development .env with a random SECRET_KEY, and
    optionally seeds the demo account with original artwork.

.PARAMETER SkipSeed
    Do not create the demo account / demo images.

.PARAMETER SkipFrontend
    Do not run npm install for the React app.

.PARAMETER Recreate
    Delete and recreate the existing .venv (destructive to the venv only).

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File scripts/setup_local.ps1
#>
[CmdletBinding()]
param(
    [switch]$SkipSeed,
    [switch]$SkipFrontend,
    [switch]$Recreate
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $root "backend"
$frontend = Join-Path $root "frontend"
$venv = Join-Path $root ".venv"
$venvPython = Join-Path $venv "Scripts\python.exe"

Write-Host ""
Write-Host "AEROPIX local setup" -ForegroundColor Cyan
Write-Host "Workspace: $root"
Write-Host ""

# --- Locate Python 3.11+ ----------------------------------------------------
$python = $null
$pythonArgs = @()
if (Get-Command py -ErrorAction SilentlyContinue) {
    $python = "py"
    $pythonArgs = @("-3")
} elseif (Get-Command python -ErrorAction SilentlyContinue) {
    $python = "python"
} else {
    throw "Python 3.11+ was not found. Install it from https://www.python.org/downloads/ and enable 'Add python.exe to PATH'."
}

& $python @pythonArgs -c "import sys; raise SystemExit(0 if sys.version_info >= (3, 11) else 1)"
if ($LASTEXITCODE -ne 0) {
    throw "AEROPIX requires Python 3.11 or newer. Run 'py -3 --version' to check your installation."
}
$pyVersion = (& $python @pythonArgs -c "import platform; print(platform.python_version())").Trim()
Write-Host "Python $pyVersion found." -ForegroundColor Green

# --- Virtual environment ----------------------------------------------------
if ($Recreate -and (Test-Path $venv)) {
    Write-Host "Removing existing virtual environment (--Recreate)..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force $venv
}
if (-not (Test-Path $venvPython)) {
    Write-Host "Creating virtual environment at .venv ..."
    & $python @pythonArgs -m venv $venv
}
if (-not (Test-Path $venvPython)) {
    throw "Virtual environment creation failed: $venvPython not found."
}

Write-Host "Installing backend dependencies (this can take a minute) ..."
& $venvPython -m pip install --upgrade pip --quiet
& $venvPython -m pip install -r (Join-Path $backend "requirements-dev.txt") --quiet
if ($LASTEXITCODE -ne 0) { throw "pip install failed." }

# --- Development environment file ------------------------------------------
$envPath = Join-Path $root ".env"
if (-not (Test-Path $envPath)) {
    Write-Host "Creating .env at the project root with a random SECRET_KEY ..."
    $secret = (& $venvPython -c "import secrets; print(secrets.token_urlsafe(48))").Trim()
    $content = Get-Content (Join-Path $backend ".env.example") -Raw
    $content = $content -replace "(?m)^SECRET_KEY=.*$", "SECRET_KEY=$secret"
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($envPath, $content, $utf8NoBom)
    Write-Host "Wrote $envPath" -ForegroundColor Green
} else {
    Write-Host "Keeping existing .env (delete it to regenerate)." -ForegroundColor Yellow
}

# --- Demo data --------------------------------------------------------------
if (-not $SkipSeed) {
    Write-Host "Seeding the demo account and original demo artwork ..."
    Push-Location $backend
    try {
        & $venvPython -m app.seed
        if ($LASTEXITCODE -ne 0) { throw "Demo seeding failed. Check the output above." }
    } finally {
        Pop-Location
    }
}

# --- Frontend ---------------------------------------------------------------
if (-not $SkipFrontend) {
    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
        Write-Warning "npm was not found. Install Node.js 20+ then run 'npm install' inside frontend/."
    } else {
        Write-Host "Installing frontend dependencies ..."
        Push-Location $frontend
        try {
            if (Test-Path (Join-Path $frontend "package-lock.json")) {
                npm ci
            } else {
                npm install
            }
            if ($LASTEXITCODE -ne 0) { throw "npm install failed." }
        } finally {
            Pop-Location
        }
    }
}

# --- Done -------------------------------------------------------------------
Write-Host ""
Write-Host "Setup complete." -ForegroundColor Green
Write-Host ""
Write-Host "Start the backend (terminal 1):" -ForegroundColor Cyan
Write-Host "  cd backend"
Write-Host "  ..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000"
Write-Host ""
Write-Host "Start the frontend (terminal 2):" -ForegroundColor Cyan
Write-Host "  cd frontend"
Write-Host "  npm run dev"
Write-Host ""
Write-Host "Open http://localhost:5173" -ForegroundColor Cyan
Write-Host "Demo login: demo@aeropix.app / AeropixDemo123!"
Write-Host ""
Write-Host "Run the test suite:" -ForegroundColor Cyan
Write-Host "  cd backend"
Write-Host "  ..\.venv\Scripts\python.exe -m pytest -q"
Write-Host ""
