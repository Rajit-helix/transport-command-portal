param(
  [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot),
  [int]$DockerWaitSeconds = 120
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Test-DockerReady {
  try {
    docker info | Out-Null
    return $true
  } catch {
    return $false
  }
}

$deadline = (Get-Date).AddSeconds($DockerWaitSeconds)
$ready = $false
while ((Get-Date) -lt $deadline) {
  if (Test-DockerReady) {
    $ready = $true
    break
  }
  Start-Sleep -Seconds 2
}

if (-not $ready) {
  throw "Docker engine is not available. Start Docker Desktop and try again."
}

Push-Location $ProjectRoot
try {
  docker compose up -d
} finally {
  Pop-Location
}
