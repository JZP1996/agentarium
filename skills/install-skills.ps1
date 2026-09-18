[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [string]$Catalog,
    [string[]]$Agent,
    [switch]$Preview,
    [switch]$Force,
    [switch]$Help
)

$ErrorActionPreference = 'Stop'

if ($Help) {
    Write-Output 'Usage: install-skills.ps1 [catalog.json|https://...] -Agent <name[]> [-Preview] [-Force]'
    Write-Output 'Default: install all Agentarium Skills and the awesome-skills selection through Skills CLI.'
    Write-Output '-Preview prints commands without installing. -Force permits replacement, not old ownership conflicts.'
    return
}
if (-not $Agent -or @($Agent | Where-Object { $_ -cnotmatch '^[a-z0-9]+(?:-[a-z0-9]+)*$' }).Count) {
    throw 'Supply -Agent with one or more agent names; no default agents are selected'
}
if ($Preview -and $Force) { throw '-Force cannot be combined with -Preview' }
if ($PSBoundParameters.ContainsKey('Catalog') -and [string]::IsNullOrWhiteSpace($Catalog)) {
    throw 'Catalog must be a non-empty path or HTTPS URL'
}

# Resolve native executables, avoiding PowerShell aliases and npx.ps1 policy issues.
$isWindowsHost = $env:OS -eq 'Windows_NT'
$node = (Get-Command $(if ($isWindowsHost) { 'node.exe' } else { 'node' }) -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
$curl = (Get-Command $(if ($isWindowsHost) { 'curl.exe' } else { 'curl' }) -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
if (-not $Preview) {
    $null = Get-Command $(if ($isWindowsHost) { 'npx.cmd' } else { 'npx' }) -CommandType Application -ErrorAction Stop
}

$temporary = Join-Path ([IO.Path]::GetTempPath()) ('install-skills-' + [Guid]::NewGuid().ToString('N'))
try {
    $null = New-Item -ItemType Directory -Path $temporary -ErrorAction Stop
    $entry = Join-Path $temporary 'install-skills.js'
    & $curl --fail --silent --show-error --location --proto '=https' --proto-redir '=https' `
        --connect-timeout 10 --max-time 60 --max-filesize 1048576 `
        'https://raw.githubusercontent.com/JZP1996/agentarium/HEAD/skills/install-skills.js' --output $entry
    if ($LASTEXITCODE -ne 0) { throw "Could not download installer (curl exit $LASTEXITCODE); no Skills were installed." }

    $nodeArguments = @($entry)
    if ($PSBoundParameters.ContainsKey('Catalog')) { $nodeArguments += $Catalog }
    if (-not $Preview) { $nodeArguments += '--install' }
    if ($Force) { $nodeArguments += '--force' }
    $nodeArguments += '--agent'
    $nodeArguments += $Agent
    & $node @nodeArguments
    if ($LASTEXITCODE -ne 0) { throw "Skills installer failed (exit $LASTEXITCODE). Earlier successful installs are not rolled back." }
} finally {
    if (Test-Path -LiteralPath $temporary) {
        Remove-Item -LiteralPath $temporary -Recurse -Force -ErrorAction Stop
    }
}
