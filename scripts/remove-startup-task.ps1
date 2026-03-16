Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

param(
  [string]$TaskName = "ProjectCodex-Autostart"
)

if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
  Write-Host "Scheduled task '$TaskName' removed." -ForegroundColor Yellow
} else {
  Write-Host "Scheduled task '$TaskName' not found."
}
