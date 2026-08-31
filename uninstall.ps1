param([string]$InstallDirectory = $(if ($env:AGENTARIUM_HOME) { $env:AGENTARIUM_HOME } else { Join-Path $HOME ".agents" }))

$ErrorActionPreference = "Stop"

$SourceDirectory = $PSScriptRoot
$AssetInstaller = Join-Path $SourceDirectory "scripts/install-assets.js"

function Invoke-NativeChecked([scriptblock]$Command) {
    & $Command
    if ($LASTEXITCODE -ne 0) {
        throw "Native command failed with exit code $LASTEXITCODE"
    }
}

$OpenCodeDirectory = Join-Path $HOME ".config/opencode"
$ClaudeDirectory = Join-Path $HOME ".claude"
$CodexDirectory = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $HOME ".codex" }
$HasIntegrations =
    (Test-Path (Join-Path $OpenCodeDirectory ".agentarium-managed-plugins")) -or
    (Test-Path (Join-Path $ClaudeDirectory "skills/.agentarium-managed-skills")) -or
    (Test-Path (Join-Path $ClaudeDirectory "agentarium")) -or
    (Test-Path (Join-Path $CodexDirectory ".agentarium-managed-hooks.json")) -or
    (Test-Path (Join-Path $CodexDirectory "agentarium"))

if ($HasIntegrations -and -not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw "Node.js is required to uninstall Agentarium integrations"
}

if (Get-Command node -ErrorAction SilentlyContinue) {
    Invoke-NativeChecked { & node $AssetInstaller remove-block `
        (Join-Path $OpenCodeDirectory "AGENTS.md") }
    Invoke-NativeChecked { & node $AssetInstaller remove-plugins `
        (Join-Path $OpenCodeDirectory "plugins") `
        (Join-Path $OpenCodeDirectory ".agentarium-managed-plugins") }

    if ((Get-Command claude -ErrorAction SilentlyContinue) -and
        (Get-Command bash -ErrorAction SilentlyContinue)) {
        $MarketplaceInstaller = Join-Path $ClaudeDirectory "agentarium/marketplace/install.sh"
        if (Test-Path -LiteralPath $MarketplaceInstaller) {
            Invoke-NativeChecked { & bash $MarketplaceInstaller --uninstall }
        }
    }
    Invoke-NativeChecked { & node $AssetInstaller remove-block `
        (Join-Path $ClaudeDirectory "rules/agentarium.md") }
    Invoke-NativeChecked { & node $AssetInstaller remove-skills `
        (Join-Path $ClaudeDirectory "skills") `
        (Join-Path $ClaudeDirectory "skills/.agentarium-managed-skills") }
    Remove-Item (Join-Path $ClaudeDirectory "agentarium") -Recurse -Force -ErrorAction SilentlyContinue

    Invoke-NativeChecked { & node $AssetInstaller remove-block `
        (Join-Path $CodexDirectory "AGENTS.md") }
    Invoke-NativeChecked { & node `
        (Join-Path $SourceDirectory "integrations/codex/install-hooks.js") `
        $CodexDirectory (Join-Path $SourceDirectory "integrations/codex/hooks/hooks.json") --remove }
    Remove-Item (Join-Path $CodexDirectory "agentarium") -Recurse -Force -ErrorAction SilentlyContinue
}

Remove-Item (Join-Path $InstallDirectory "AGENTS.md") -Force -ErrorAction SilentlyContinue
Remove-Item (Join-Path $InstallDirectory "instructions") -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item (Join-Path $InstallDirectory "skills") -Recurse -Force -ErrorAction SilentlyContinue
if ((Test-Path -LiteralPath $InstallDirectory) -and
    -not (Get-ChildItem -LiteralPath $InstallDirectory -Force)) {
    Remove-Item $InstallDirectory -Force
}
Write-Host "Removed Agentarium-managed files and configuration blocks."
