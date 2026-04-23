$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$distPath = Join-Path $projectRoot "dist"
$pidFile = Join-Path $projectRoot ".blog-preview.pid"
$port = 4173
$url = "http://127.0.0.1:$port"

if (-not (Test-Path $distPath)) {
  Write-Host "dist does not exist. Run npm run build first."
  exit 1
}

if (Test-Path $pidFile) {
  $existingPid = Get-Content $pidFile -ErrorAction SilentlyContinue
  if ($existingPid) {
    $existingProcess = Get-Process -Id $existingPid -ErrorAction SilentlyContinue
    if ($existingProcess) {
      Write-Host "Preview server is already running: $url"
      Start-Process $url
      exit 0
    }
  }
}

$process = Start-Process `
  -FilePath "python" `
  -ArgumentList @("-m", "http.server", "$port", "--bind", "127.0.0.1", "--directory", $distPath) `
  -WorkingDirectory $projectRoot `
  -PassThru `
  -WindowStyle Hidden

Set-Content -Path $pidFile -Value $process.Id
Start-Sleep -Seconds 2
Start-Process $url

Write-Host "Preview server started: $url"
