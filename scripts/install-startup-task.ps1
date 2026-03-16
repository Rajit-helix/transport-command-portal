param(
  [string]$TaskName = "ProjectCodex-Autostart",
  [switch]$AtStartup
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$startScript = Join-Path $PSScriptRoot "start-docker.ps1"

if (-not (Test-Path -LiteralPath $startScript)) {
  throw "Missing start script: $startScript"
}

$argument = "-NoProfile -ExecutionPolicy Bypass -File `"$startScript`""
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $argument

if ($AtStartup) {
  $trigger = New-ScheduledTaskTrigger -AtStartup
} else {
  $trigger = New-ScheduledTaskTrigger -AtLogOn
}

$userId = "$env:USERDOMAIN\$env:UserName"
$principal = New-ScheduledTaskPrincipal -UserId $userId -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -MultipleInstances IgnoreNew

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $action `
  -Trigger $trigger `
  -Principal $principal `
  -Settings $settings `
  -Force | Out-Null

Write-Host "Scheduled task '$TaskName' installed." -ForegroundColor Green
