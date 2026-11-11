$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
function Test-ExpoNode([string]$Executable) {
    if (!(Test-Path -LiteralPath $Executable)) { return $false }
    $nodeVersion = [version](& $Executable -p 'process.versions.node')
    return ($nodeVersion.Major -eq 22 -and $nodeVersion.Minor -ge 13) -or
        ($nodeVersion.Major -eq 24 -and $nodeVersion.Minor -ge 3) -or $nodeVersion.Major -ge 26
}
$systemNode = (Get-Command node.exe -ErrorAction SilentlyContinue).Source
if ($systemNode -and (Test-ExpoNode $systemNode)) { $systemNode; return }
$localNode = Join-Path $projectRoot '.tools/node24/node_modules/node/bin/node.exe'
if (!(Test-ExpoNode $localNode)) {
    Write-Host 'Expo SDK 58 needs a supported Node version. Installing Node 24 locally in .tools/node24...'
    & npm.cmd install --prefix (Join-Path $projectRoot '.tools/node24') --no-save node@24.22.2 | Out-Host
    if ($LASTEXITCODE -ne 0 -or !(Test-ExpoNode $localNode)) { throw 'Could not prepare Node 24 for Expo SDK 58.' }
}
$localNode
