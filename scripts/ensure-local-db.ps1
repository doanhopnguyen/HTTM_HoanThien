$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot

$dbName = 'pool_safety'
$settings = @{}
Get-Content -LiteralPath '.env' | ForEach-Object {
    if ($_ -match '^([A-Z_][A-Z_0-9]*)=(.*)$') { $settings[$Matches[1]] = $Matches[2] }
}
$dbUser = $settings['DB_USER']
$dbPassword = $settings['DB_PASSWORD']
if (!$dbUser -or !$dbPassword) { throw 'DB_USER and DB_PASSWORD must be set in .env.' }
$quotedUser = '"' + $dbUser.Replace('"', '""') + '"'
$quotedPassword = $dbPassword.Replace("'", "''")

& docker compose up -d postgres
if ($LASTEXITCODE -ne 0) { throw 'Could not start PostgreSQL. Make sure Docker Desktop is running.' }

# POSTGRES_DB only creates a database when the Docker volume is initialized.
# This also handles an already existing postgres_data volume.
$roleSql = "ALTER ROLE $quotedUser WITH PASSWORD '$quotedPassword';"
& docker compose exec -T postgres psql -U $dbUser -d postgres -c $roleSql
if ($LASTEXITCODE -ne 0) { throw 'Could not configure the local PostgreSQL role.' }

$databaseExists = & docker compose exec -T postgres psql -U $dbUser -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$dbName'"
if ($LASTEXITCODE -ne 0) { throw 'Could not check whether the local database exists.' }
if ($databaseExists.Trim() -ne '1') {
    & docker compose exec -T postgres createdb -U $dbUser -O $dbUser $dbName
    if ($LASTEXITCODE -ne 0) { throw 'Could not create the local database.' }
}

Write-Host "Database '$dbName' is ready for local development."
