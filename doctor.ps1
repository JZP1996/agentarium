param([string]$InstallDirectory = $(if ($env:AGENTARIUM_HOME) { $env:AGENTARIUM_HOME } else { Join-Path $HOME ".agents" }))
$Failed = $false

function Write-Check([string]$Label, [bool]$Success) {
    if ($Success) {
        Write-Host "  ✓ $Label"
    }
    else {
        Write-Host "  ✗ $Label" -ForegroundColor Red
        $script:Failed = $true
    }
}

Write-Host "Agentarium doctor"
Write-Check "shared instructions" (Test-Path (Join-Path $InstallDirectory "AGENTS.md") -PathType Leaf)
Write-Check "shared Skills" (Test-Path (Join-Path $InstallDirectory "skills") -PathType Container)

if (Get-Command node -ErrorAction SilentlyContinue) {
    Write-Host "  ✓ Node.js"
}
else {
    Write-Warning "Node.js is unavailable; integrations cannot be installed or removed"
}

if ($Failed) { exit 1 }
