param([switch]$EmbeddedPostgres)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot
if (!(Test-Path -LiteralPath '.env')) { & (Join-Path $PSScriptRoot 'init-env.ps1') }
foreach ($line in Get-Content -LiteralPath '.env') {
    if ($line -match '^([A-Z_][A-Z_0-9]*)=(.*)$') { [Environment]::SetEnvironmentVariable($Matches[1], $Matches[2], 'Process') }
}
if (!$env:MEDIA_DIRECTORY) { $env:MEDIA_DIRECTORY = Join-Path $projectRoot '.runtime/media' }
if ($EmbeddedPostgres) {
    # The embedded developer database always uses localhost:5433 and trust authentication.
    # It is for local development only and is never a production database.
    [Environment]::SetEnvironmentVariable('DB_URL', 'jdbc:postgresql://localhost:5433/postgres', 'Process')
    [Environment]::SetEnvironmentVariable('DB_USER', 'postgres', 'Process')
    [Environment]::SetEnvironmentVariable('DB_PASSWORD', '', 'Process')
    & mvn.cmd -B -q -f backend/pom.xml test-compile dependency:build-classpath '-Dmdep.includeScope=test' '-Dmdep.outputFile=target/test-classpath.txt'
    if ($LASTEXITCODE -ne 0) { throw 'Maven setup failed' }
    $dependencyClasspath = Get-Content -Raw -LiteralPath 'backend/target/test-classpath.txt'
    $applicationClasspath = "backend/target/classes;backend/target/test-classes;$($dependencyClasspath.Trim())"
    & java -cp $applicationClasspath com.poolsafety.LocalSystemLauncher
} else {
    & mvn.cmd -f backend/pom.xml spring-boot:run
}
