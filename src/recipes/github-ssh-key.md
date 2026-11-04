---
title: Set up an SSH key for GitHub
summary: Generate an Ed25519 SSH key, load it into ssh-agent, add it to your GitHub account, test the connection, and switch a repo from HTTPS to SSH.
category: Git & GitHub
tags: [git, github, ssh, ssh-keygen, ssh-agent, ed25519, authentication, push]
difficulty: Beginner
time: 10 min
os: [linux, macos, windows]
verified: 2026-11-04
featured: true
prerequisites:
  - A GitHub account
  - Git installed (<code>git --version</code> prints a version)
  - "Windows: the built-in OpenSSH client, included in Windows 10 and later"
variables:
  - key: EMAIL
    label: Your GitHub email
    default: you@example.com
  - key: KEY_TITLE
    label: Key name on GitHub
    default: My laptop
  - key: GH_USER
    label: GitHub username
    default: octocat
  - key: REPO
    label: Repository name
    default: my-project
sources:
  - title: Generating a new SSH key and adding it to the ssh-agent
    url: https://docs.github.com/en/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent
    publisher: GitHub Docs
  - title: Adding a new SSH key to your GitHub account
    url: https://docs.github.com/en/authentication/connecting-to-github-with-ssh/adding-a-new-ssh-key-to-your-github-account
    publisher: GitHub Docs
  - title: Testing your SSH connection
    url: https://docs.github.com/en/authentication/connecting-to-github-with-ssh/testing-your-ssh-connection
    publisher: GitHub Docs
  - title: GitHub's SSH key fingerprints
    url: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/githubs-ssh-key-fingerprints
    publisher: GitHub Docs
---

With an SSH key, `git push` and `git pull` work without typing a password or token each time. GitHub recommends **Ed25519** keys.

## Check for an existing key

```bash linux,macos
ls -al ~/.ssh
```

```powershell windows
Get-ChildItem -Force $HOME\.ssh
```

If you already see `id_ed25519` and `id_ed25519.pub`, you can reuse them and skip to step 3. If the folder doesn't exist, that's fine, the next step creates it.

## Generate a new key

```bash
ssh-keygen -t ed25519 -C "{{EMAIL}}"
```

```output
Generating public/private ed25519 key pair.
Enter file in which to save the key (/home/you/.ssh/id_ed25519):
Enter passphrase (empty for no passphrase):
```

Press **Enter** to accept the default file. Then choose a passphrase. It protects the key if your laptop is stolen, and the agent in the next step means you won't have to retype it often.

> Very old system without Ed25519 support? Use `ssh-keygen -t rsa -b 4096 -C "{{EMAIL}}"` instead.

## Load the key into ssh-agent

```bash linux
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519
```

```zsh macos
eval "$(ssh-agent -s)"

# Create ~/.ssh/config (if it doesn't exist) so macOS keeps the key in your Keychain
touch ~/.ssh/config
cat >> ~/.ssh/config <<'EOF'
Host github.com
  AddKeysToAgent yes
  UseKeychain yes
  IdentityFile ~/.ssh/id_ed25519
EOF

# Use Apple's built-in ssh-add, not a Homebrew/MacPorts one
ssh-add --apple-use-keychain ~/.ssh/id_ed25519
```

```powershell windows
# 1) In an *Administrator* PowerShell window: enable and start the agent
Get-Service -Name ssh-agent | Set-Service -StartupType Manual
Start-Service ssh-agent

# 2) Back in a normal (non-admin) window: add your key
ssh-add $HOME\.ssh\id_ed25519
```

```output linux,macos
Identity added: /home/you/.ssh/id_ed25519 ({{EMAIL}})
```

> **macOS:** no passphrase on your key? Leave out the `UseKeychain yes` line. If you get `Bad configuration option: usekeychain`, add `IgnoreUnknown UseKeychain` under `Host github.com`.

## Copy your public key

Copy the **`.pub`** file only. Never share the private key (the file without `.pub`).

```bash linux
cat ~/.ssh/id_ed25519.pub
# Select and copy the whole line that starts with ssh-ed25519
```

```zsh macos
pbcopy < ~/.ssh/id_ed25519.pub
```

```powershell windows
Get-Content $HOME\.ssh\id_ed25519.pub | Set-Clipboard
```

## Add the key to your GitHub account

**In the browser:** GitHub → profile photo → **Settings** → **SSH and GPG keys** → **New SSH key**. Name it `{{KEY_TITLE}}`, keep type *Authentication Key*, paste the key, then **Add SSH key**.

**Or from the terminal** with the GitHub CLI (`gh auth login` first):

```bash linux,macos
gh ssh-key add ~/.ssh/id_ed25519.pub --title "{{KEY_TITLE}}"
```

```powershell windows
gh ssh-key add $HOME\.ssh\id_ed25519.pub --title "{{KEY_TITLE}}"
```

## Test the connection

```bash
ssh -T git@github.com
```

```output
The authenticity of host 'github.com (IP ADDRESS)' can't be established.
ED25519 key fingerprint is SHA256:+DiY3wvvV6TuJJhbpZisF/zLDA0zPMSvHdkr4UvCOqU.
Are you sure you want to continue connecting (yes/no)? yes
Hi {{GH_USER}}! You've successfully authenticated, but GitHub does not provide shell access.
```

Before typing `yes`, check that the fingerprint matches [GitHub's published fingerprints](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/githubs-ssh-key-fingerprints).

## Use SSH for your repositories

Clone new repos with the SSH URL, or switch an existing HTTPS clone over:

```bash
# New clone
git clone git@github.com:{{GH_USER}}/{{REPO}}.git

# Existing clone: run inside the repo folder
git remote set-url origin git@github.com:{{GH_USER}}/{{REPO}}.git
git remote -v
```

```output
origin  git@github.com:{{GH_USER}}/{{REPO}}.git (fetch)
origin  git@github.com:{{GH_USER}}/{{REPO}}.git (push)
```

## Troubleshooting

**`Permission denied (publickey)`**: the agent doesn't have your key. Run `ssh-add -l` to list loaded keys, then repeat step 3.

**Windows: Git keeps asking for the passphrase**: Git for Windows may be using its bundled `ssh.exe` instead of Windows OpenSSH. Point Git at the system one:

```powershell windows
git config --global core.sshCommand "C:/Windows/System32/OpenSSH/ssh.exe"
```

**macOS: asked for the passphrase after every reboot**: check that `~/.ssh/config` has the `UseKeychain yes` block from step 3.
