@echo off
chcp 65001 >nul
cd /d "%~dp0"
set PORT=8765
echo.
echo  ATA LIFE Guest House
echo  Sunucu: http://127.0.0.1:%PORT%/
echo  Giris: admin / atalife
echo.
start "" "http://127.0.0.1:%PORT%/index.html"
py -m http.server %PORT%
if errorlevel 1 (
  echo Python bulunamadi. index.html dosyasina cift tiklayarak da acabilirsiniz.
  pause
)
