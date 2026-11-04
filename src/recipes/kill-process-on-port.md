---
title: Find and kill the process using a port
summary: Fix "address already in use" / EADDRINUSE errors by finding which program is listening on a port, stopping it safely, and confirming the port is free.
category: Networking
tags: [port, eaddrinuse, address already in use, lsof, ss, netstat, kill, process, localhost, troubleshooting]
difficulty: Beginner
time: 5 min
os: [linux, macos, windows]
verified: 2026-11-04
featured: false
prerequisites:
  - "Admin rights help: <code>sudo</code> on Linux/macOS, or an Administrator PowerShell on Windows, to see and stop other users' processes"
variables:
  - key: PORT
    label: Port number
    default: "3000"
  - key: PID
    label: Process ID (PID)
    default: "12345"
    hint: Fill this in from step 1's output
sources:
  - title: lsof(8) manual page
    url: https://github.com/lsof-org/lsof/blob/master/Lsof.8
    publisher: lsof project
  - title: ss(8) manual page
    url: https://github.com/iproute2/iproute2/blob/main/man/man8/ss.8
    publisher: iproute2 project
  - title: Get-NetTCPConnection (NetTCPIP)
    url: https://learn.microsoft.com/en-us/powershell/module/nettcpip/get-nettcpconnection
    publisher: Microsoft Learn
  - title: Stop-Process
    url: https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/stop-process
    publisher: Microsoft Learn
---

A dev server failing with `EADDRINUSE`, `address already in use` or `port is already allocated` means another process is already listening on that port. Often it's an old copy of the same server.

## Find what's listening on the port

```bash linux
sudo ss -ltnp 'sport = :{{PORT}}'
```

```output linux
State   Recv-Q  Send-Q  Local Address:Port  Peer Address:Port  Process
LISTEN  0       511     0.0.0.0:{{PORT}}         0.0.0.0:*          users:(("node",pid={{PID}},fd=21))
```

```zsh macos
lsof -nP -iTCP:{{PORT}} -sTCP:LISTEN
```

```output macos
COMMAND   PID   USER   FD   TYPE  DEVICE  SIZE/OFF NODE NAME
node    {{PID}}   you    21u  IPv4  0x...      0t0  TCP *:{{PORT}} (LISTEN)
```

```powershell windows
Get-NetTCPConnection -LocalPort {{PORT}} -State Listen |
  Select-Object LocalAddress, LocalPort, OwningProcess,
    @{ Name = 'ProcessName'; Expression = { (Get-Process -Id $_.OwningProcess).ProcessName } }
```

```output windows
LocalAddress LocalPort OwningProcess ProcessName
------------ --------- ------------- -----------
::                {{PORT}}         {{PID}} node
```

Copy the PID into **Your values → Process ID**. Nothing printed? Then nothing is listening on that port. Check that you have the right port number.

> On Linux, `lsof -nP -iTCP:{{PORT}} -sTCP:LISTEN` works too, if `lsof` is installed.

## Check what that process is

Make sure you're not about to stop something important, like a database or a system service.

```bash linux,macos
ps -p {{PID}} -o pid,user,command
```

```powershell windows
Get-Process -Id {{PID}} | Format-List Id, ProcessName, Path, StartTime
```

## Stop it politely

This asks the process to shut down cleanly.

```bash linux,macos
kill {{PID}}
# use: sudo kill {{PID}}  if it belongs to another user
```

```powershell windows
Stop-Process -Id {{PID}}
```

## Force it if it won't stop

Only use this if the polite stop didn't work. The process gets no chance to save its work.

```bash linux,macos
kill -9 {{PID}}
```

```powershell windows
Stop-Process -Id {{PID}} -Force
```

## Confirm the port is free

Run step 1's command again. **No output means the port is free.** Now restart your server.

```bash linux
sudo ss -ltnp 'sport = :{{PORT}}'
```

```zsh macos
lsof -nP -iTCP:{{PORT}} -sTCP:LISTEN
```

```powershell windows
Get-NetTCPConnection -LocalPort {{PORT}} -State Listen -ErrorAction SilentlyContinue
```

## Going further: one-liners

Find and stop whatever is listening on the port in one go. Be careful: this skips step 2's check.

```bash linux,macos
lsof -t -iTCP:{{PORT}} -sTCP:LISTEN | xargs kill
```

```powershell windows
Get-NetTCPConnection -LocalPort {{PORT}} -State Listen |
  ForEach-Object { Stop-Process -Id $_.OwningProcess }
```

## Troubleshooting

**The process comes straight back**: a supervisor is restarting it, such as systemd, Docker, pm2, nodemon or a Windows service. Stop it at that level instead, e.g. `docker ps` then `docker stop <name>`, or `sudo systemctl stop <service>`.

**Windows shows PID 0 or 4**: that's the System process (e.g. `http.sys`, which serves IIS). Don't kill it. Change your app's port instead, or stop the Windows service that registered the port.

**`Operation not permitted` / `Access is denied`**: the process belongs to another user. Use `sudo` (Linux/macOS) or an Administrator PowerShell (Windows).
