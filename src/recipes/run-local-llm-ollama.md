---
title: Run a local AI model with Ollama
summary: Install Ollama, download and chat with an open model on your own machine, and call it from code through its local REST API on port 11434.
category: AI & LLMs
tags: [ai, llm, ollama, local ai, gemma, api, offline, chatbot, gpu]
difficulty: Beginner
time: 15 min
os: [linux, macos, windows]
verified: 2026-11-04
featured: true
prerequisites:
  - Several GB of free disk space for each model
  - "Enough RAM for the model (small models run in 8 GB; bigger ones need 16 GB+). A GPU helps but isn't required."
variables:
  - key: MODEL
    label: Model name
    default: gemma4
    hint: Any model from ollama.com/library
  - key: PROMPT
    label: Test prompt
    default: Why is the sky blue?
sources:
  - title: Ollama README (install commands, REST API example)
    url: https://github.com/ollama/ollama/blob/main/README.md
    publisher: Ollama on GitHub
  - title: Ollama on Linux (systemd service, manual install, updates)
    url: https://docs.ollama.com/linux
    publisher: Ollama Docs
  - title: Ollama CLI reference
    url: https://docs.ollama.com/cli
    publisher: Ollama Docs
  - title: Ollama API reference
    url: https://docs.ollama.com/api
    publisher: Ollama Docs
  - title: Ollama model library
    url: https://ollama.com/library
    publisher: Ollama
---

Ollama downloads open-weight models and runs them locally. Your prompts never leave your machine, and it works offline once a model is downloaded.

## Install Ollama

```bash linux,macos
curl -fsSL https://ollama.com/install.sh | sh
```

```powershell windows
irm https://ollama.com/install.ps1 | iex
```

> Prefer a regular installer? Download `Ollama.dmg` (macOS) or `OllamaSetup.exe` (Windows) from [ollama.com/download](https://ollama.com/download). Piping a script into a shell runs it straight away, so if you want to check it first, open the URL in your browser and read it.

## Check that it's installed and running

```bash
ollama -v
```

```output
ollama version is 0.x.x
```

```bash linux
# On Linux the installer sets up a systemd service
sudo systemctl status ollama
```

On macOS and Windows, Ollama runs as a menu-bar/tray app. If `ollama` says it can't connect, start the app (or run `ollama serve` in another terminal).

## Chat with a model

The first run downloads the model, which can take a few minutes.

```bash
ollama run {{MODEL}}
```

```output
pulling manifest
pulling 4f5e...: 100% ▕████████████████▏ 
success
>>> Send a message (/? for help)
```

Type a question and press Enter. Type `/bye` to exit.

## Manage your models

```bash
ollama ls            # models you've downloaded
ollama ps            # models loaded in memory right now
ollama stop {{MODEL}}  # unload a model from memory
ollama pull {{MODEL}}  # download or update without chatting
ollama rm {{MODEL}}    # delete a model to free disk space
```

## Call the model from code (REST API)

Ollama serves an API on **http://localhost:11434**. `"stream": false` returns one JSON reply instead of a stream of chunks.

```bash linux,macos
curl http://localhost:11434/api/chat -d '{
  "model": "{{MODEL}}",
  "messages": [{ "role": "user", "content": "{{PROMPT}}" }],
  "stream": false
}'
```

```powershell windows
$body = @{
  model    = "{{MODEL}}"
  messages = @(@{ role = "user"; content = "{{PROMPT}}" })
  stream   = $false
} | ConvertTo-Json -Depth 5
Invoke-RestMethod -Uri http://localhost:11434/api/chat -Method Post -ContentType "application/json" -Body $body
```

```output
{"model":"{{MODEL}}","created_at":"...","message":{"role":"assistant","content":"The sky looks blue because..."},"done":true,...}
```

## Troubleshooting

**`ollama` says it can't connect to the server**: on Linux run `sudo systemctl start ollama`. On macOS/Windows open the Ollama app.

**Very slow answers**: the model may be too big for your RAM/GPU. Try a smaller variant (many models have tags like `:2b` or `:4b` on [ollama.com/library](https://ollama.com/library)), and check `ollama ps` to see whether it's running on GPU or CPU.

**Update Ollama**: on Linux, run the install command from step 1 again. On macOS/Windows, the app updates itself.

## Clean up

```bash linux
# Stop and disable the service (Linux)
sudo systemctl stop ollama
sudo systemctl disable ollama
```

```bash macos,windows
# Quit Ollama from the menu bar / system tray, then remove models you don't need:
ollama rm {{MODEL}}
```
