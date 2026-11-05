@echo off
chcp 65001 >nul
cd /d "%~dp0"
if not exist "node_modules\electron\dist\electron.exe" (
  where node >nul 2>&1
  if errorlevel 1 (
    echo Node.js kurulu degil. https://nodejs.org adresinden LTS surumu kurun.
    pause
    exit /b 1
  )
  echo Ilk acilis: uygulama dosyalari indiriliyor...
  call npm install
  if errorlevel 1 (
    echo Kurulum tamamlanamadi.
    pause
    exit /b 1
  )
)
set "ELECTRON=%~dp0node_modules\electron\dist\electron.exe"
start "" "%ELECTRON%" .
if errorlevel 1 (
  echo Uygulama acilamadi.
  pause
)
