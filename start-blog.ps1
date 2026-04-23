$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$distPath = Join-Path $projectRoot "dist"
$pidFile = Join-Path $projectRoot ".blog-preview.pid"
$port = 8787
$url = "http://127.0.0.1:$port"

if (Test-Path $pidFile) {
  $existingPid = Get-Content $pidFile -ErrorAction SilentlyContinue
  if ($existingPid) {
    $existingProcess = Get-Process -Id $existingPid -ErrorAction SilentlyContinue
    if ($existingProcess) {
      Stop-Process -Id $existingPid -ErrorAction SilentlyContinue
    }
  }

  Remove-Item $pidFile -ErrorAction SilentlyContinue
}

$distIndex = Join-Path $distPath "index.html"
if (-not (Test-Path $distIndex)) {
  Write-Host "Building latest site files..."
  & npm run build
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed."
    exit $LASTEXITCODE
  }
}

$srcLatest = Get-ChildItem -Path (Join-Path $projectRoot "src") -Recurse -File | Sort-Object LastWriteTime -Descending | Select-Object -First 1
$distLatest = Get-ChildItem -Path $distPath -Recurse -File -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if ($srcLatest -and (-not $distLatest -or $srcLatest.LastWriteTime -gt $distLatest.LastWriteTime)) {
  Write-Host "Detected newer source files. Rebuilding..."
  & npm run build
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed."
    exit $LASTEXITCODE
  }
}

$env:PORT = "$port"
$process = Start-Process `
  -FilePath "node" `
  -ArgumentList @("server.js") `
  -WorkingDirectory $projectRoot `
  -PassThru `
  -WindowStyle Hidden

Set-Content -Path $pidFile -Value $process.Id
Start-Sleep -Seconds 2
Start-Process $url

Write-Host "Preview server started: $url"
