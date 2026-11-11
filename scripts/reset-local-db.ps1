param([switch]$Reset)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
foreach ($line in Get-Content -LiteralPath '.env') {
    if ($line -match '^([A-Z_][A-Z_0-9]*)=(.*)$') {
        [Environment]::SetEnvironmentVariable($Matches[1], $Matches[2], 'Process')
    }
}
& mvn.cmd -B -q -f backend/pom.xml dependency:build-classpath '-Dmdep.includeScope=runtime' '-Dmdep.outputFile=target/runtime-classpath.txt'
if ($LASTEXITCODE -ne 0) { throw 'Could not prepare the database driver.' }
$dbClasspath = (Get-Content -Raw -LiteralPath 'backend/target/runtime-classpath.txt').Trim()
if ($Reset) {
    & java -cp $dbClasspath scripts/LocalDatabase.java reset
} else {
    & java -cp $dbClasspath scripts/LocalDatabase.java
}
if ($LASTEXITCODE -ne 0) { throw 'Database operation failed.' }
