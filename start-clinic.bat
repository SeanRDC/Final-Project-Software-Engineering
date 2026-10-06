@echo off
rem Double-click to start HAU-Sync on the clinic's server computer. See start-clinic.ps1.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-clinic.ps1" %*
pause
