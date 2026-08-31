param(
    [string]$Distro = "Ubuntu",
    [string]$ListenAddress = "0.0.0.0",
    [int]$ListenPort = 2222,
    [int]$ConnectPort = 22
)

$ErrorActionPreference = "Stop"

# Start the distribution so its current internal address is available.
wsl.exe -d $Distro -- bash -lc "true"
if ($LASTEXITCODE -ne 0) {
    throw "Unable to start WSL distribution '$Distro'."
}

Start-Sleep -Seconds 3

$wslIp = ((wsl.exe -d $Distro -- hostname -I).Trim() -split "\s+")[0]
if ([string]::IsNullOrWhiteSpace($wslIp)) {
    throw "Unable to determine the WSL internal address."
}

# Replace the old target because the WSL internal address can change.
netsh.exe interface portproxy delete v4tov4 `
    listenaddress=$ListenAddress listenport=$ListenPort | Out-Null

netsh.exe interface portproxy add v4tov4 `
    listenaddress=$ListenAddress listenport=$ListenPort `
    connectaddress=$wslIp connectport=$ConnectPort

if ($LASTEXITCODE -ne 0) {
    throw "Unable to create the Windows portproxy rule. Run PowerShell as Administrator."
}

Write-Host "Forwarding Windows:$ListenPort to WSL:$wslIp`:$ConnectPort"
