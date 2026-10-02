param([Parameter(Mandatory=$true)][string]$CameraId, [string]$BaseUrl = 'http://localhost:8080')
$ErrorActionPreference = 'Stop'
$serviceKey = $env:AI_SERVICE_KEY
if (!$serviceKey) {
    $envPath = Join-Path (Split-Path -Parent $PSScriptRoot) '.env'
    if (Test-Path -LiteralPath $envPath) { foreach ($line in Get-Content -LiteralPath $envPath) { if ($line -match '^AI_SERVICE_KEY=(.*)$') { $serviceKey = $Matches[1] } } }
}
if (!$serviceKey) { throw 'Set AI_SERVICE_KEY in the environment or root .env' }
$body = @{ cameraId=$CameraId; eventType='DROWNING'; confidence=0.94; detectedAt=[DateTime]::UtcNow.ToString('o'); metadata=@{ source='development-mock' } } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/detection-events" -Headers @{'X-AI-SERVICE-KEY'=$serviceKey} -ContentType 'application/json' -Body $body
