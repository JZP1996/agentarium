---
name: wsl-remote-development
description: Guide users through remote development from another computer into Ubuntu on WSL2 running on Windows. Use this skill whenever the user asks about WSL SSH, Windows portproxy, VS Code Remote SSH, WSL-local proxy setup, or using Windows Git Credential Manager from WSL. Keep the workflow local-network focused, use placeholders instead of machine-specific addresses and usernames, and troubleshoot from the network layer upward.
---

# Remote WSL Guidance

Use this skill to design, explain, troubleshoot, or maintain a local-network remote development setup:

```text
Remote client -> Windows local-network address:2222
              -> Windows portproxy -> WSL2 Ubuntu:22
              -> SSH / VS Code Remote SSH
```

The default client may be macOS, but keep the instructions portable to any SSH-capable client.

## Scope

Include:

- WSL2 Ubuntu installation and verification.
- WSL systemd and OpenSSH server setup.
- Windows `portproxy` from a local-network address to WSL SSH.
- Windows Firewall and Task Scheduler configuration.
- SSH keys, the `wsl-dev` SSH alias, and VS Code Remote SSH.
- A WSL-local v2rayA proxy installed from packages.
- Using Windows Git Credential Manager from WSL.
- Layered troubleshooting and verification commands.

Do not add unless explicitly requested:

- Tailscale or other cross-network access.
- GlobalProtect or corporate VPN troubleshooting.
- Windows App/RDP setup.
- Terminal-specific fixes such as Ghostty terminfo.
- chezmoi, CUDA, Docker, or unrelated Windows troubleshooting.

## General Rules

- Use placeholders such as `WINDOWS_HOST`, `WSL_USER`, `WSL_DISTRO`, `local-network`, `wsl-internal`, `~`, and `$HOME`.
- Never insert a real IP address, Windows username, repository name, subscription URL, token, or private key.
- Do not use a WSL internal address as the remote client's stable address. It changes when WSL restarts.
- Explain whether a command runs in Windows PowerShell, WSL Ubuntu, or the remote client.
- Verify each layer before moving to the next layer:
  1. WSL SSH listens on port 22.
  2. Windows portproxy points to the current WSL address.
  3. Windows listens on port 2222 and Firewall permits it.
  4. The remote client can reach Windows:2222.
  5. Plain SSH works before configuring VS Code.
- Do not recommend exposing SSH or RDP directly to the public internet.
- Do not disable package signature verification or security controls to make installation succeed.

## 1. Install and Verify WSL2

Run in an elevated Windows PowerShell:

```powershell
wsl --install -d Ubuntu
```

If Windows asks for a restart, restart before opening Ubuntu and creating the Linux user.

Verify:

```powershell
wsl --status
wsl --list --verbose
```

The target distribution must show `VERSION 2`:

```powershell
wsl --set-version Ubuntu 2
wsl --set-default Ubuntu
```

Use the Linux user created during first-run as `WSL_USER`.

## 2. Configure SSH in WSL

Run in Ubuntu:

```bash
sudo apt update
sudo apt install -y openssh-server
```

Enable systemd by creating or updating `/etc/wsl.conf`:

```bash
sudo tee /etc/wsl.conf >/dev/null <<'EOF'
[boot]
systemd=true
EOF
```

From Windows PowerShell:

```powershell
wsl --shutdown
```

Open Ubuntu again and start SSH automatically:

```bash
sudo systemctl enable --now ssh
sudo systemctl status ssh --no-pager
sudo ss -tlnp | grep ':22'
```

The expected state is `active (running)` with SSH listening on `0.0.0.0:22` and/or `[::]:22`.

Test inside WSL before configuring Windows forwarding:

```bash
ssh localhost
```

## 3. Configure Windows Portproxy

WSL2 uses a NAT network. Use the bundled script at `scripts/UpdateWslPortproxy.ps1` to update the forwarding target after WSL restarts.

Run the script in an elevated Windows PowerShell. Its defaults are:

```text
Distribution: Ubuntu
Windows listen address: 0.0.0.0
Windows listen port: 2222
WSL SSH port: 22
```

Run it from the directory containing the skill script, or copy it to a convenient location first:

```powershell
powershell.exe -File ".\scripts\UpdateWslPortproxy.ps1"
```

The script can be customized without editing it:

```powershell
powershell.exe -File ".\scripts\UpdateWslPortproxy.ps1" `
  -Distro "Ubuntu" -ListenPort 2222 -ConnectPort 22
```

Verify the rule:

```powershell
netsh interface portproxy show all
```

The result should show a Windows listener on `0.0.0.0:2222` forwarding to the current `wsl-internal:22` address.

Do not manually hard-code the WSL address in a permanent configuration.

## 4. Allow the Windows Port Through Firewall

Run this as an administrator in one line. A one-line command avoids PowerShell continuation and elevation argument parsing issues:

```powershell
netsh advfirewall firewall add rule name="WSL SSH 2222" dir=in action=allow protocol=tcp localport=2222 profile=any
```

If using `gsudo`:

```powershell
gsudo netsh advfirewall firewall add rule name="WSL SSH 2222" dir=in action=allow protocol=tcp localport=2222 profile=any
```

Verify:

```powershell
netsh advfirewall firewall show rule name="WSL SSH 2222"
```

Keep the rule limited to the required local network where the environment allows it. Do not open this port on an untrusted or public interface without an explicit security design.

## 5. Automate the Portproxy Update

Use Windows Task Scheduler to run the script at startup:

- Create a task named `WSL Portproxy Auto Update`.
- Enable `Run with highest privileges`.
- Trigger: `At startup`.
- Add a delay of about 30 seconds.
- Action: `powershell.exe`.
- Arguments:

```text
-File "FULL_PATH_TO_UpdateWslPortproxy.ps1"
```

Use an actual full path in Task Scheduler; do not rely on `~` there. Set retry behavior if the task fails. Manually run the task once and verify `netsh interface portproxy show all`.

## 6. Verify From the Remote Client

First identify the Windows address reachable on the same local network. Call it `WINDOWS_HOST`; do not use the WSL internal address.

From the remote client:

```bash
nc -vz WINDOWS_HOST 2222
ssh -p 2222 WSL_USER@WINDOWS_HOST
```

If `nc` times out, check Windows Firewall, local-network isolation, VPN routing, and the portproxy rule. If the port is reachable but SSH is refused, check the WSL SSH service and port 22.

## 7. Configure SSH Keys and Alias

On the remote client, create a key only if one is not already available:

```bash
ssh-keygen -t ed25519
```

Add the public key to WSL using the first password-authenticated SSH connection:

```bash
cat ~/.ssh/id_ed25519.pub | \
  ssh -p 2222 WSL_USER@WINDOWS_HOST \
  "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
```

Configure `~/.ssh/config` on the remote client:

```sshconfig
Host wsl-dev
    HostName WINDOWS_HOST
    User WSL_USER
    Port 2222
    IdentityFile ~/.ssh/id_ed25519
    ServerAliveInterval 30
    ServerAliveCountMax 3
```

Test:

```bash
ssh wsl-dev
```

## 8. Use VS Code Remote SSH

Install VS Code and the `Remote - SSH` extension on the remote client.

Use `Remote-SSH: Connect to Host...` and select `wsl-dev`. Open a Linux directory such as:

```text
/home/WSL_USER/projects
```

Confirm the remote terminal reports Ubuntu and that the VS Code status bar shows an SSH connection. Do not troubleshoot VS Code until `ssh wsl-dev` works in a normal terminal.

## 9. Run a WSL-Local Proxy

If Windows must not use a system proxy, run v2rayA inside WSL and configure only WSL programs to use it.

Install v2rayA and a compatible core through the official Debian/Ubuntu package instructions:

<https://v2raya.org/docs/prologue/installation/debian/>

Then enable the service:

```bash
sudo systemctl enable --now v2raya.service
sudo systemctl status v2raya.service --no-pager
```

The default management interface is normally:

```text
http://127.0.0.1:2017
```

If accessing WSL through SSH, forward the management port from the remote client:

```bash
ssh -L 2017:127.0.0.1:2017 wsl-dev
```

Open `http://127.0.0.1:2017`, import the subscription URL, select a server, and start the proxy service. Do not include subscription URLs in shell history, repositories, or documentation.

The usual v2rayA inbound ports are:

- `20170`: SOCKS5
- `20171`: HTTP
- `20172`: routed HTTP

Confirm the actual ports in the v2rayA UI, then configure WSL programs. For HTTP proxy use:

```bash
export http_proxy="http://127.0.0.1:20171"
export https_proxy="http://127.0.0.1:20171"
export all_proxy="http://127.0.0.1:20171"
export HTTP_PROXY="$http_proxy"
export HTTPS_PROXY="$https_proxy"
export ALL_PROXY="$all_proxy"
export no_proxy="localhost,127.0.0.1,::1"
export NO_PROXY="$no_proxy"
```

Persist these only if desired by adding them to the active shell profile. Test the proxy explicitly:

```bash
curl -I -x http://127.0.0.1:20171 https://www.google.com
curl -I https://www.google.com
```

`ping` does not use an HTTP proxy and is not a proxy test. Use `NO_PROXY` for local services such as LiteLLM on `localhost`.

For APT:

```bash
sudo tee /etc/apt/apt.conf.d/80proxy >/dev/null <<'EOF'
Acquire::http::Proxy "http://127.0.0.1:20171";
Acquire::https::Proxy "http://127.0.0.1:20171";
EOF
```

For Git:

```bash
git config --global http.proxy http://127.0.0.1:20171
git config --global https.proxy http://127.0.0.1:20171
```

## 10. Use Windows Git Credential Manager From WSL

This is useful when WSL Git must access a private GitHub repository without configuring SSH keys.

First confirm Windows has Git Credential Manager. In Windows PowerShell:

```powershell
Get-Command git-credential-manager.exe
```

If it is not on `PATH`, search the Windows Git installation directory with `Get-ChildItem`. Do not assume a fixed Windows username or installation directory.

Convert the discovered Windows path to a WSL path with `wslpath`, then configure WSL Git:

```bash
git config --global credential.helper \
  "/mnt/c/PATH_TO/git-credential-manager.exe"
```

Verify:

```bash
git config --global --get credential.helper
```

Use an HTTPS repository URL:

```bash
git clone https://github.com/GITHUB_OWNER/REPOSITORY.git
```

GCM opens the Windows browser for authentication and stores credentials using Windows credential storage. The GitHub account must already have permission to the private repository. Do not use an SSH URL when testing GCM.

## Troubleshooting

### `portproxy show all` is empty

Run `UpdateWslPortproxy.ps1` in an elevated PowerShell and verify that the WSL distribution starts successfully.

### Windows local port test fails

Run:

```powershell
Test-NetConnection 127.0.0.1 -Port 2222
```

If it fails, check the portproxy rule and WSL SSH service before checking the remote client.

### Remote client times out

Check the Windows Firewall rule, local-network isolation, and whether the remote client can reach `WINDOWS_HOST`. Do not troubleshoot VS Code first.

### `Connection refused`

The Windows port is reachable, but the forwarding target is not accepting SSH. In WSL check:

```bash
sudo systemctl status ssh --no-pager
sudo ss -tlnp | grep ':22'
```

### Portproxy points to an old WSL address

Run the bundled script again. The WSL internal address is expected to change after WSL restarts.

### v2rayA has no proxy ports

The service may be running without a selected server. Open the v2rayA UI, import or update the subscription, select at least one server, and start the proxy service. Confirm with:

```bash
sudo ss -tlnp | grep -E '20170|20171|20172'
```

### `code .` does not work

Use the remote client's VS Code `Remote - SSH` extension and connect to `wsl-dev`. A normal WSL SSH shell does not necessarily contain a local GUI `code` command.

## Completion Checklist

- WSL reports version 2.
- `ssh` is enabled and listens on port 22 inside WSL.
- The portproxy rule forwards Windows `2222` to the current WSL address on port 22.
- Windows Firewall permits TCP `2222` from the intended local network.
- The remote client can run `ssh wsl-dev`.
- VS Code Remote SSH opens a Linux directory.
- v2rayA is optional and only affects programs configured to use its local proxy.
