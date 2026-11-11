param(
    [string]$Python = 'python',
    [string]$BackendUrl = 'http://localhost:8080',
    [string]$ReferenceProject = '',
    [string]$Device = 'cpu'
)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
foreach ($line in Get-Content -LiteralPath '.env') {
    if ($line -match '^([A-Z_][A-Z_0-9]*)=(.*)$') {
        [Environment]::SetEnvironmentVariable($Matches[1], $Matches[2], 'Process')
    }
}
$env:AI_BACKEND_URL = $BackendUrl
$env:AI_DEVICE = $Device
if ($ReferenceProject) { $env:REFERENCE_PROJECT = $ReferenceProject }
& $Python ai/worker.py
if ($LASTEXITCODE -ne 0) { throw 'AI worker failed. Install ai/requirements.txt in the selected Python environment.' }
