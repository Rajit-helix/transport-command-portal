Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $projectRoot "backend"
$frontendDir = Join-Path $projectRoot "frontend"
$runtimeDir = Join-Path $projectRoot ".dev-runtime"
$pidFile = Join-Path $runtimeDir "pids.json"
$portsFile = Join-Path $runtimeDir "ports.json"

New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null

function Test-PortFree {
  param([int]$Port)

  $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
  try {
    $listener.Start()
    return $true
  } catch {
    return $false
  } finally {
    try { $listener.Stop() } catch {}
  }
}

function Get-FreePort {
  param(
    [int]$Preferred,
    [int]$MaxOffset = 30
  )

  for ($candidate = $Preferred; $candidate -le ($Preferred + $MaxOffset); $candidate++) {
    if (Test-PortFree -Port $candidate) {
      return $candidate
    }
  }

  throw "No free port found in range $Preferred-$($Preferred + $MaxOffset)."
}

function Wait-ForTcpPort {
  param(
    [int]$Port,
    [int]$TimeoutSeconds = 45
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    if (-not (Test-PortFree -Port $Port)) {
      return $true
    }
    Start-Sleep -Milliseconds 500
  }

  return $false
}

function Wait-ForHttp200 {
  param(
    [string]$Url,
    [int]$TimeoutSeconds = 90
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    try {
      $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
      if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400) {
        return $true
      }
    } catch {
      Start-Sleep -Milliseconds 700
    }
  }

  return $false
}

function Stop-TrackedProcesses {
  if (-not (Test-Path -LiteralPath $pidFile)) {
    return
  }

  try {
    $state = Get-Content -LiteralPath $pidFile -Raw | ConvertFrom-Json
  } catch {
    Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
    return
  }

  if (-not $state.processes) {
    Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
    return
  }

  foreach ($entry in $state.processes) {
    $id = [int]$entry.id
    $proc = Get-Process -Id $id -ErrorAction SilentlyContinue
    if (-not $proc) {
      continue
    }

    $canStop = $true
    if ($entry.startedAt) {
      try {
        $runningStart = $proc.StartTime.ToUniversalTime().ToString("o")
        if ($runningStart -ne $entry.startedAt) {
          $canStop = $false
        }
      } catch {
        $canStop = $false
      }
    }

    if ($canStop) {
      try {
        Stop-Process -Id $id -Force -ErrorAction Stop
      } catch {
        Write-Host "Warning: could not stop previous process PID $id" -ForegroundColor Yellow
      }
    }
  }

  Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
}

Stop-TrackedProcesses

$dbPort = 5432
$backendPort = Get-FreePort -Preferred 4000
$frontendPort = Get-FreePort -Preferred 5173
$trackedProcesses = @()

Write-Host "Starting services with auto-selected ports..." -ForegroundColor Cyan
Write-Host "  Embedded DB : $dbPort"
Write-Host "  Backend API : $backendPort"
Write-Host "  Frontend    : $frontendPort"

if (Test-PortFree -Port $dbPort) {
  $dbCmd = "cd /d `"$backendDir`" && set `"EMBEDDED_PG_PORT=$dbPort`" && npm run start:embedded-db"
  $dbProc = Start-Process -FilePath "cmd.exe" -ArgumentList "/k", $dbCmd -PassThru

  if (-not (Wait-ForTcpPort -Port $dbPort -TimeoutSeconds 45)) {
    throw "Embedded PostgreSQL did not start on port $dbPort in time."
  }

  $trackedProcesses += @{
    name = "embedded-db"
    id = $dbProc.Id
    startedAt = $dbProc.StartTime.ToUniversalTime().ToString("o")
  }
} else {
  Write-Host "  Reusing existing PostgreSQL on port $dbPort" -ForegroundColor DarkCyan
}

$backendCmd = "cd /d `"$backendDir`" && set `"PORT=$backendPort`" && set `"DATABASE_URL=postgres://postgres:postgres@localhost:$dbPort/transport_db`" && set `"CORS_ORIGINS=http://localhost:$frontendPort`" && set `"FRONTEND_URL=http://localhost:$frontendPort`" && set `"REDIS_URL=`" && npm run migrate:up && npm run seed && npm run start"
$backendProc = Start-Process -FilePath "cmd.exe" -ArgumentList "/k", $backendCmd -PassThru

if (-not (Wait-ForHttp200 -Url "http://localhost:$backendPort/api/health" -TimeoutSeconds 90)) {
  throw "Backend API did not become healthy at http://localhost:$backendPort/api/health."
}

$trackedProcesses += @{
  name = "backend"
  id = $backendProc.Id
  startedAt = $backendProc.StartTime.ToUniversalTime().ToString("o")
}

$frontendCmd = "cd /d `"$frontendDir`" && set `"VITE_API_BASE_URL=http://localhost:$backendPort/api`" && set `"VITE_SOCKET_URL=http://localhost:$backendPort`" && npm run dev -- --host 0.0.0.0 --port $frontendPort --strictPort"
$frontendProc = Start-Process -FilePath "cmd.exe" -ArgumentList "/k", $frontendCmd -PassThru

if (-not (Wait-ForHttp200 -Url "http://localhost:$frontendPort" -TimeoutSeconds 60)) {
  throw "Frontend did not start at http://localhost:$frontendPort."
}

$trackedProcesses += @{
  name = "frontend"
  id = $frontendProc.Id
  startedAt = $frontendProc.StartTime.ToUniversalTime().ToString("o")
}

$processState = @{
  processes = $trackedProcesses
}

$portState = @{
  frontend = $frontendPort
  backend = $backendPort
  database = $dbPort
  loginUrl = "http://localhost:$frontendPort/login"
  healthUrl = "http://localhost:$backendPort/api/health"
  startedAt = (Get-Date).ToUniversalTime().ToString("o")
}

$processState | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $pidFile
$portState | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $portsFile

Write-Host ""
Write-Host "ProjectCodex is ready." -ForegroundColor Green
Write-Host "Frontend login : http://localhost:$frontendPort/login"
Write-Host "Backend health : http://localhost:$backendPort/api/health"
Write-Host ""
Write-Host "Tip: run the same command again and it will stop the previous app windows first." -ForegroundColor DarkCyan
