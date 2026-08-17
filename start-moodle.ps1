# Start the local Moodle demo (MariaDB + PHP built-in server).
$ErrorActionPreference = "Stop"

$php = Join-Path $PSScriptRoot "tools\php83\php.exe"
$mariadbd = "C:\Program Files\MariaDB 12.3\bin\mariadbd.exe"
$myini = "C:\Program Files\MariaDB 12.3\data\my.ini"
$moodle = Join-Path $PSScriptRoot "moodle"

if (-not (Get-Process mariadbd -ErrorAction SilentlyContinue)) {
    Start-Process -FilePath $mariadbd -ArgumentList "--defaults-file=`"$myini`"" -WindowStyle Hidden
    Start-Sleep -Seconds 2
}

Write-Host "Moodle:  http://127.0.0.1:8080"
Write-Host "Plugin:  http://127.0.0.1:8080/local/campusupdates/index.php"
Write-Host "Login:   admin  /  CampusDemo1!"
Write-Host ""

& $php -S 127.0.0.1:8080 -t $moodle
