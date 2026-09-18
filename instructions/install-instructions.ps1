[CmdletBinding()]
param(
    [string[]]$Agent,
    [switch]$Preview,
    [switch]$Force,
    [switch]$Help
)

$ErrorActionPreference = 'Stop'

if ($Help) {
    Write-Output 'Usage: install-instructions.ps1 -Agent <name[]> [-Preview] [-Force]'
    Write-Output 'Install shared Instructions and links only for explicitly selected agents.'
    Write-Output '-Preview shows destinations without installing. -Force permits replacement after reviewing existing files.'
    return
}
if (-not $Agent -or @($Agent | Where-Object { $_ -cnotin @('codex', 'opencode') }).Count) {
    throw 'Supply -Agent with codex, opencode, or both; no default agents'
}
if ($Preview -and $Force) { throw '-Force cannot be combined with -Preview' }

# Resolve native executables, avoiding PowerShell aliases.
$isWindowsHost = $env:OS -eq 'Windows_NT'
$node = (Get-Command $(if ($isWindowsHost) { 'node.exe' } else { 'node' }) -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
$curl = (Get-Command $(if ($isWindowsHost) { 'curl.exe' } else { 'curl' }) -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source

$temporary = Join-Path ([IO.Path]::GetTempPath()) ('install-instructions-' + [Guid]::NewGuid().ToString('N'))
try {
    $null = New-Item -ItemType Directory -Path $temporary -ErrorAction Stop
    $entry = Join-Path $temporary 'install-instructions.js'
    & $curl --fail --silent --show-error --location --proto '=https' --proto-redir '=https' `
        --connect-timeout 10 --max-time 60 --max-filesize 1048576 `
        'https://raw.githubusercontent.com/JZP1996/agentarium/HEAD/instructions/install-instructions.js' --output $entry
    if ($LASTEXITCODE -ne 0) { throw "Could not download installer (curl exit $LASTEXITCODE); no Instructions were installed." }

    $nodeArguments = @($entry, '--agent') + $Agent
    if (-not $Preview) { $nodeArguments += '--install' }
    if ($Force) { $nodeArguments += '--force' }
    & $node @nodeArguments
    if ($LASTEXITCODE -ne 0) { throw "Instructions installer failed (exit $LASTEXITCODE). Earlier successful installs are not rolled back." }
} finally {
    if (Test-Path -LiteralPath $temporary) {
        Remove-Item -LiteralPath $temporary -Recurse -Force -ErrorAction Stop
    }
}
