param(
    [string]$Action = 'start',
    [Parameter(ValueFromRemainingArguments=$true)][string[]]$ExpoArguments
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$nodeExecutable = & (Join-Path $PSScriptRoot 'mobile-node.ps1')
$env:PATH = "$(Split-Path -Parent $nodeExecutable);$env:PATH"
Set-Location -LiteralPath (Join-Path $projectRoot 'mobile')
$expoCli = Join-Path $projectRoot 'node_modules/expo/bin/cli'
Write-Host "Running Expo SDK 58 ($Action) using $nodeExecutable"
& $nodeExecutable $expoCli $Action @ExpoArguments
exit $LASTEXITCODE
