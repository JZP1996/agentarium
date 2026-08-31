[CmdletBinding()]
param(
    [string]$InstallDirectory = (Join-Path $HOME ".agents"),
    [AllowEmptyString()]
    [string]$Integrations,
    [switch]$Force
)

$ErrorActionPreference = "Stop"
$PSNativeCommandUseErrorActionPreference = $true
$SourceDirectory = $PSScriptRoot
$AssetInstaller = Join-Path $SourceDirectory "scripts/install-assets.js"
$SelectionWasProvided = $PSBoundParameters.ContainsKey("Integrations")
$EffectiveForce = $Force.IsPresent

function Invoke-NativeChecked([scriptblock]$Command) {
    & $Command
    if ($LASTEXITCODE -ne 0) {
        throw "Native command failed with exit code $LASTEXITCODE"
    }
}

function Invoke-PreflightCheck([scriptblock]$Command) {
    $NativePreference = $PSNativeCommandUseErrorActionPreference
    try {
        $PSNativeCommandUseErrorActionPreference = $false
        $Output = & $Command 2>&1
        if ($LASTEXITCODE -ne 0) {
            $script:PreflightErrors.Add(($Output | Out-String).Trim())
        }
    }
    finally {
        $PSNativeCommandUseErrorActionPreference = $NativePreference
    }
}

if ($SelectionWasProvided) {
    $Selection = $Integrations
}
else {
    Write-Host ""
    Write-Host "Configure agent integrations (comma-separated, Enter to skip):"
    Write-Host "  1) OpenCode"
    Write-Host "  2) Claude Code"
    Write-Host "  3) Codex"
    $Selection = Read-Host "Selection"
}

$Selection = $Selection -replace "\s", ""
if ($Selection -notmatch "^(?:[123](?:,[123])*)?$") {
    throw "Invalid integration selection: $Selection"
}

$Choices = [System.Collections.Generic.List[string]]::new()
if ($Selection) {
    foreach ($Choice in $Selection.Split(",")) {
        if (-not $Choices.Contains($Choice)) {
            $Choices.Add($Choice)
        }
    }
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        throw "Node.js is required for the selected integrations"
    }
}

function Invoke-Preflight {
    $script:PreflightErrors = [System.Collections.Generic.List[string]]::new()
    foreach ($Choice in $Choices) {
        switch ($Choice) {
        "1" {
            $ConfigDirectory = Join-Path $HOME ".config/opencode"
            Invoke-PreflightCheck { & node $AssetInstaller check-link `
                (Join-Path $ConfigDirectory "AGENTS.md") `
                (Join-Path $InstallDirectory "AGENTS.md") $EffectiveForce }
            Invoke-PreflightCheck { & node $AssetInstaller check-plugins `
                (Join-Path $SourceDirectory "integrations/opencode/plugins") `
                (Join-Path $ConfigDirectory "plugins") `
                (Join-Path $ConfigDirectory ".agentarium-managed-plugins") `
                $EffectiveForce }
        }
        "2" {
            Invoke-PreflightCheck { & node $AssetInstaller check-block (Join-Path $HOME ".claude/rules/agentarium.md") }
            Invoke-PreflightCheck { & node $AssetInstaller check-skills (Join-Path $SourceDirectory "skills") `
                (Join-Path $HOME ".claude/skills") `
                (Join-Path $HOME ".claude/skills/.agentarium-managed-skills") `
                $EffectiveForce }
        }
        "3" {
            $CodexHome = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $HOME ".codex" }
            Invoke-PreflightCheck { & node $AssetInstaller check-link `
                (Join-Path $CodexHome "AGENTS.md") `
                (Join-Path $InstallDirectory "AGENTS.md") $EffectiveForce }
            $Arguments = @($CodexHome, (Join-Path $SourceDirectory "integrations/codex/hooks/hooks.json"), "--check")
            if ($EffectiveForce) { $Arguments += "--force" }
            Invoke-PreflightCheck { & node (Join-Path $SourceDirectory "integrations/codex/install-hooks.js") @Arguments }
        }
        }
    }
    if ($PreflightErrors.Count -gt 0) {
        throw ($PreflightErrors -join "`n")
    }
}

try {
    Invoke-Preflight
}
catch {
    Write-Host $_.Exception.Message -ForegroundColor Yellow
    if ($SelectionWasProvided) {
        throw "Use -Force to overwrite unmanaged conflicts"
    }
    $Answer = Read-Host "Overwrite these unmanaged conflicts? [y/N]"
    if ($Answer -notmatch '^(?i:y|yes)$') { throw "Installation cancelled" }
    $EffectiveForce = $true
    Invoke-Preflight
}

function Sync-Directory {
    param([string]$Source, [string]$Destination)

    if (Test-Path -LiteralPath $Destination) {
        $Item = Get-Item -LiteralPath $Destination -Force
        if ($Item.LinkType) {
            Remove-Item -LiteralPath $Destination -Force
            New-Item -ItemType Directory -Path $Destination -Force | Out-Null
        }
        elseif (-not $Item.PSIsContainer) {
            throw "Installation target is not a directory: $Destination"
        }
        else {
            Get-ChildItem -LiteralPath $Destination -Force | Remove-Item -Recurse -Force
        }
    }
    else {
        New-Item -ItemType Directory -Path $Destination -Force | Out-Null
    }

    Copy-Item -Path (Join-Path $Source "*") -Destination $Destination -Recurse -Force
    Get-ChildItem -LiteralPath $Source -Force -Filter ".*" | ForEach-Object {
        Copy-Item -LiteralPath $_.FullName -Destination $Destination -Recurse -Force
    }
}

function Install-Core {
    New-Item -ItemType Directory -Path $InstallDirectory -Force | Out-Null
    @("opencode", "claude-code") | ForEach-Object {
        $LegacyPath = Join-Path $InstallDirectory $_
        if (Test-Path -LiteralPath $LegacyPath) {
            Remove-Item -LiteralPath $LegacyPath -Recurse -Force
        }
    }
    Sync-Directory (Join-Path $SourceDirectory "skills") (Join-Path $InstallDirectory "skills")
    Sync-Directory (Join-Path $SourceDirectory "instructions") (Join-Path $InstallDirectory "instructions")

    $Base = Get-Content -LiteralPath (Join-Path $InstallDirectory "instructions/base.md") -Raw
    $Engineering = Get-Content -LiteralPath (Join-Path $InstallDirectory "instructions/engineering.md") -Raw
    $Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [IO.File]::WriteAllText((Join-Path $InstallDirectory "AGENTS.md"), "# Agent Guidelines`n`n$Base`n$Engineering", $Utf8NoBom)
}

function Install-OpenCode {
    $ConfigDirectory = Join-Path $HOME ".config/opencode"
    $PluginDirectory = Join-Path $ConfigDirectory "plugins"
    $Manifest = Join-Path $ConfigDirectory ".agentarium-managed-plugins"
    Invoke-NativeChecked { & node $AssetInstaller link `
        (Join-Path $ConfigDirectory "AGENTS.md") `
        (Join-Path $InstallDirectory "AGENTS.md") $EffectiveForce }
    Invoke-NativeChecked { & node $AssetInstaller plugins `
        (Join-Path $SourceDirectory "integrations/opencode/plugins") $PluginDirectory $Manifest `
        $EffectiveForce }
    Write-Host "Installed Agentarium OpenCode integration: managed instructions, plugins, and $Manifest"
}

function Install-Claude {
    $ConfigDirectory = Join-Path $HOME ".claude"
    $RuntimeDirectory = Join-Path $ConfigDirectory "agentarium"
    $RulesDirectory = Join-Path $ConfigDirectory "rules"
    $SkillsDirectory = Join-Path $ConfigDirectory "skills"

    Sync-Directory (Join-Path $SourceDirectory "integrations/claude-code") $RuntimeDirectory
    New-Item -ItemType Directory -Path $RulesDirectory -Force | Out-Null
    Invoke-NativeChecked { & node $AssetInstaller block (Join-Path $RulesDirectory "agentarium.md") `
        (Join-Path $InstallDirectory "AGENTS.md") }
    Invoke-NativeChecked { & node $AssetInstaller skills (Join-Path $InstallDirectory "skills") `
        $SkillsDirectory (Join-Path $SkillsDirectory ".agentarium-managed-skills") $EffectiveForce }

    if ((Get-Command claude -ErrorAction SilentlyContinue) -and
        (Get-Command bash -ErrorAction SilentlyContinue) -and
        (Get-Command jq -ErrorAction SilentlyContinue)) {
        Invoke-NativeChecked { & bash (Join-Path $RuntimeDirectory "marketplace/install.sh") }
    }
    else {
        Write-Warning "Claude marketplace plugins were not registered; claude, bash, and jq are required."
    }
    Write-Host "Installed Agentarium Claude Code integration: rules, Skills, runtime, and marketplace plugins"
}

function Install-Codex {
    $ConfigDirectory = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $HOME ".codex" }
    $RuntimeDirectory = Join-Path $ConfigDirectory "agentarium"
    New-Item -ItemType Directory -Path $ConfigDirectory -Force | Out-Null
    Invoke-NativeChecked { & node $AssetInstaller link (Join-Path $ConfigDirectory "AGENTS.md") `
        (Join-Path $InstallDirectory "AGENTS.md") $EffectiveForce }
    Sync-Directory (Join-Path $SourceDirectory "integrations/codex") $RuntimeDirectory
    Remove-Item -LiteralPath (Join-Path $RuntimeDirectory "tests") -Recurse -Force
    $Arguments = @($ConfigDirectory, (Join-Path $RuntimeDirectory "hooks/hooks.json"))
    if ($EffectiveForce) { $Arguments += "--force" }
    Invoke-NativeChecked { & node (Join-Path $RuntimeDirectory "install-hooks.js") @Arguments }
    Write-Host "Installed Agentarium Codex integration: managed instructions, runtime hooks, and hooks.json entries"
    Write-Host "Review and trust the installed hooks with /hooks in Codex."
}

Install-Core
Write-Host "Installed Agentarium core files to $InstallDirectory"

foreach ($Choice in $Choices) {
    switch ($Choice) {
        "1" { Install-OpenCode }
        "2" { Install-Claude }
        "3" { Install-Codex }
    }
}
