$projectRoot = "C:\Users\KIIT0001\ProjectCodex"
$backendDir = Join-Path $projectRoot "backend"
$frontendDir = Join-Path $projectRoot "frontend"

# Start backend with embedded database in a separate window
Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm run start:embedded-db" -WorkingDirectory $backendDir -WindowStyle Normal

# Small delay so backend starts first
Start-Sleep -Seconds 3

# Start frontend dev server in a separate window
Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm run dev" -WorkingDirectory $frontendDir -WindowStyle Normal
