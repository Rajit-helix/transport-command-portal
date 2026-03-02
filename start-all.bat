@echo off
setlocal

set "PROJECT_ROOT=C:\Users\KIIT0001\ProjectCodex"

start "ProjectCodex Backend" cmd /k "cd /d %PROJECT_ROOT%\backend && npm run start:embedded-db"
timeout /t 3 /nobreak >nul
start "ProjectCodex Frontend" cmd /k "cd /d %PROJECT_ROOT%\frontend && npm run dev"

echo ProjectCodex servers started.
echo Frontend: http://localhost:5173/login
echo Backend:  http://localhost:4000
