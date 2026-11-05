---
title: Install Docker and run your first container
summary: Install Docker Engine on Ubuntu or Docker Desktop on macOS/Windows, check it with hello-world, run a web server in a container, and clean up.
category: Containers
tags: [docker, containers, docker desktop, docker engine, ubuntu, nginx, devops, compose]
difficulty: Beginner
time: 20 min
os: [linux, macos, windows]
verified: 2026-11-04
featured: true
prerequisites:
  - "Linux: Ubuntu 22.04, 24.04, 26.04 LTS or 26.10, with a sudo-capable user"
  - "macOS: a recent macOS on Apple silicon or Intel"
  - "Windows: Windows 10/11 with WSL 2 enabled (Docker Desktop sets this up for you)"
variables:
  - key: HOST_PORT
    label: Port on your machine
    default: "8080"
    hint: The web server will be at http://localhost:<this port>
  - key: NAME
    label: Container name
    default: web
sources:
  - title: Install Docker Engine on Ubuntu (Engine 29.9.3)
    url: https://docs.docker.com/engine/install/ubuntu/
    publisher: Docker Docs
  - title: Linux post-installation steps for Docker Engine
    url: https://docs.docker.com/engine/install/linux-postinstall/
    publisher: Docker Docs
  - title: Install Docker Desktop on Mac
    url: https://docs.docker.com/desktop/setup/install/mac-install/
    publisher: Docker Docs
  - title: Install Docker Desktop on Windows
    url: https://docs.docker.com/desktop/setup/install/windows-install/
    publisher: Docker Docs
---

On **Linux** you install *Docker Engine* directly. On **macOS and Windows** you install *Docker Desktop*, which runs the engine inside a small Linux VM. After that the `docker` commands are the same everywhere.

> **Ubuntu:** don't use the `docker.io` package from Ubuntu's own repositories. It often lags behind and may not include the Compose v2 plugin. The steps below use Docker's official apt repository.

## Remove old or conflicting packages

```bash linux
sudo apt remove $(dpkg --get-selections docker.io docker-compose docker-compose-v2 docker-doc docker-buildx podman-docker containerd runc | cut -f1)
```

It's fine if none of these are installed. `dpkg` will just print warnings.

## Install Docker

```bash linux title="Ubuntu"
# 1) Add Docker's GPG key
sudo apt update
sudo apt install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

# 2) Add Docker's apt repository
sudo tee /etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Signed-By: /etc/apt/keyrings/docker.asc
EOF

# 3) Install Docker Engine, CLI, containerd, Buildx and Compose
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

```zsh macos
# Download Docker.dmg for your chip (Apple silicon or Intel) from
# https://docs.docker.com/desktop/setup/install/mac-install/ , then:
cd ~/Downloads
sudo hdiutil attach Docker.dmg
sudo /Volumes/Docker/Docker.app/Contents/MacOS/install
sudo hdiutil detach /Volumes/Docker
open -a Docker
```

```powershell windows
# Download "Docker Desktop Installer.exe" from
# https://docs.docker.com/desktop/setup/install/windows-install/ , then:
cd $HOME\Downloads
Start-Process 'Docker Desktop Installer.exe' -Wait -ArgumentList 'install', '--user'
# --user installs per-user (no admin needed). Start Docker Desktop from the Start menu afterwards.
```

> On macOS and Windows, open Docker Desktop once and accept the terms. The `docker` command only works while Docker Desktop is running.

## Check the installation

```bash linux
sudo docker run hello-world
```

```zsh macos
docker run hello-world
```

```powershell windows
docker run hello-world
```

```output
Unable to find image 'hello-world:latest' locally
latest: Pulling from library/hello-world
...
Hello from Docker!
This message shows that your installation appears to be working correctly.
```

## Run Docker without sudo

Add yourself to the `docker` group so you don't need `sudo` for every command.

```bash linux
sudo groupadd docker      # "already exists" is fine
sudo usermod -aG docker $USER
newgrp docker             # or log out and back in
docker run hello-world    # now works without sudo
```

> **Security note:** Docker's docs warn that the `docker` group grants root-level privileges. Only add users you trust.

## Run a web server in a container

Start nginx in the background (`-d`), map port {{HOST_PORT}} on your machine to port 80 in the container (`-p`), and name it `{{NAME}}`.

```bash
docker run -d -p {{HOST_PORT}}:80 --name {{NAME}} nginx
docker ps
```

```output
CONTAINER ID   IMAGE   COMMAND                  STATUS         PORTS                  NAMES
3f2a1b9c8d7e   nginx   "/docker-entrypoint.…"   Up 3 seconds   0.0.0.0:{{HOST_PORT}}->80/tcp   {{NAME}}
```

Open `http://localhost:{{HOST_PORT}}` in your browser, or check from the terminal:

```bash linux,macos
curl -I http://localhost:{{HOST_PORT}}
```

```powershell windows
curl.exe -I http://localhost:{{HOST_PORT}}
```

```output
HTTP/1.1 200 OK
Server: nginx/...
```

## View logs and get a shell inside

```bash
docker logs -f {{NAME}}          # Ctrl+C to stop following
docker exec -it {{NAME}} sh      # type `exit` to leave
```

## Clean up

```bash
docker stop {{NAME}}
docker rm {{NAME}}
docker image prune     # remove unused images (asks first)
```

## Troubleshooting

**`permission denied while trying to connect to the Docker daemon socket`** (Linux): you're not in the `docker` group yet. Redo step 4 and log out and back in.

**`Cannot connect to the Docker daemon`**: on Linux, start it with `sudo systemctl start docker` (and `sudo systemctl enable docker.service containerd.service` to start it at boot). On macOS/Windows, open Docker Desktop and wait until it says *Running*.

**`port is already allocated`**: something else is using port {{HOST_PORT}}. Pick another port in **Your values**, or see the recipe *Find and kill the process using a port*.
