param(
    [Parameter(Mandatory=$true)][string]$BackendUrl,
    [string]$AndroidJavaHome = $env:JAVA_HOME,
    [string]$Architectures = 'arm64-v8a,x86_64',
    [switch]$AllowCleartext
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$nodeExecutable = & (Join-Path $PSScriptRoot 'mobile-node.ps1')
$env:PATH = "$(Split-Path -Parent $nodeExecutable);$env:PATH"
if (!$AndroidJavaHome -or !(Test-Path -LiteralPath (Join-Path $AndroidJavaHome 'bin/java.exe'))) { throw 'Set AndroidJavaHome to JDK 17/21 (separate from Java 25 backend)' }
$uri = [Uri]$BackendUrl
if (!$uri.IsAbsoluteUri -or $uri.Scheme -notin @('http','https')) { throw 'BackendUrl must be an absolute HTTP(S) server origin' }
if ($uri.Scheme -eq 'http' -and !$AllowCleartext) { throw 'HTTP development builds require -AllowCleartext; use HTTPS for distribution' }
Set-Location -LiteralPath (Join-Path $projectRoot 'mobile')
$env:JAVA_HOME = $AndroidJavaHome
$env:EXPO_PUBLIC_API_BASE_URL = $BackendUrl.TrimEnd('/')
$env:ALLOW_CLEARTEXT = if ($AllowCleartext) { 'true' } else { 'false' }
$ErrorActionPreference = 'Continue'
& $nodeExecutable (Join-Path $projectRoot 'node_modules/expo/bin/cli') prebuild --platform android --no-install
$nativeExitCode = $LASTEXITCODE
$ErrorActionPreference = 'Stop'
if ($nativeExitCode -ne 0) { throw 'Expo prebuild failed' }
Set-Location -LiteralPath (Join-Path $projectRoot 'mobile/android')
$ErrorActionPreference = 'Continue'
& .\gradlew.bat assembleRelease --no-daemon --max-workers=2 "-PreactNativeArchitectures=$Architectures"
$nativeExitCode = $LASTEXITCODE
$ErrorActionPreference = 'Stop'
if ($nativeExitCode -ne 0) { throw 'Android build failed' }
$artifactFolder = Join-Path $projectRoot 'artifacts'
New-Item -ItemType Directory -Force -Path $artifactFolder | Out-Null
Copy-Item -LiteralPath 'app/build/outputs/apk/release/app-release.apk' -Destination (Join-Path $artifactFolder 'PoolSafetyMonitoring.apk') -Force
Write-Host "APK: $artifactFolder\PoolSafetyMonitoring.apk"
Write-Host 'Local builds use the generated DEVELOPMENT signing key. Use your own signing credentials for distribution.'
exit 0
