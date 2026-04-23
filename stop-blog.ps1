$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$pidFile = Join-Path $projectRoot ".blog-preview.pid"

if (-not (Test-Path $pidFile)) {
  Write-Host "No preview server PID file found."
  exit 0
}

$previewPid = Get-Content $pidFile -ErrorAction SilentlyContinue
if ($previewPid) {
  Stop-Process -Id $previewPid -ErrorAction SilentlyContinue
}

Remove-Item $pidFile -ErrorAction SilentlyContinue
Write-Host "Preview server stopped."
