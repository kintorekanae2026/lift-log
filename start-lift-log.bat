@echo off
cd /d "%~dp0"
echo.
echo  Lift Log を起動しています
echo  ブラウザで http://localhost:8080 を開いてください。
echo  この黒い画面は、アプリを使っている間は閉じないでください。
echo.
node server.js
pause
