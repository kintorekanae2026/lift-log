# Lift Log をスマホ対応のアプリとしてローカルで起動します。
$port = 8080
Write-Host "Lift Log を起動しています: http://localhost:$port" -ForegroundColor Green
Write-Host "終了するには Ctrl+C を押してください。"
node server.js
