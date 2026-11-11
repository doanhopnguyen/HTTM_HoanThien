$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $projectRoot '.env'
if (Test-Path -LiteralPath $envPath) { Write-Host '.env already exists; kept existing values.'; exit 0 }
function New-Secret {
    $bytes = New-Object byte[] 48
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
    return [Convert]::ToBase64String($bytes)
}
$content = @"
DB_USER=postgres
DB_PASSWORD=$(New-Secret)
DB_URL=jdbc:postgresql://localhost:5432/pool_safety
JWT_SECRET=$(New-Secret)
AI_SERVICE_KEY=$(New-Secret)
DEV_PASSWORD=PoolSafetyDev!2026
SPRING_PROFILES_ACTIVE=dev
DEV_SAMPLE_DATA=false
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,file://,null
STAFF_FALSE_ALARM=true
POOL_TIMEZONE=Asia/Ho_Chi_Minh
"@
[IO.File]::WriteAllText($envPath, $content, (New-Object Text.UTF8Encoding($false)))
Write-Host 'Created .env with random secrets and a DEVELOPMENT ONLY login password.'
Write-Host 'Development users: admin, staff1. Password: PoolSafetyDev!2026'
