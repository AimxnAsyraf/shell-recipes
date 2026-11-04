# Contributing a recipe

A recipe is one Markdown file in `src/recipes/`. The file name becomes the URL: `src/recipes/install-docker.md` is served at `/r/install-docker/`.

Start by copying [`docs/recipe-template.md`](docs/recipe-template.md).

## Frontmatter

```yaml
---
title: Connect your desktop to an Android emulator with adb
summary: One or two sentences, shown on the card and under the title.
category: Mobile dev            # becomes a filter chip on the home page
tags: [android, adb, emulator]  # extra search keywords
difficulty: Beginner            # Beginner | Intermediate | Advanced
time: 15 min
os: [linux, macos, windows]     # OSes the recipe covers
verified: 2026-11-04            # date you last checked the commands (YYYY-MM-DD)
featured: true                  # optional, sorts first
prerequisites:                  # optional; simple HTML allowed
  - Android Studio installed
  - "Anything with a colon: must be quoted"
variables:                      # optional fill-in values
  - key: SERIAL                 # UPPER_SNAKE_CASE; use as {{SERIAL}}
    label: Emulator serial
    default: emulator-5554
    hint: From adb devices      # optional
sources:                        # required: at least one official source
  - title: Android Debug Bridge (adb)
    url: https://developer.android.com/tools/adb
    publisher: Android Developers
    date: July 2026             # optional: date of the source itself
---
```

## Body

- A short intro paragraph comes first.
- **Every `## Heading` becomes a numbered, checkable step.**
- Headings starting with *Troubleshooting*, *Next steps*, *Clean up*, *Going further* or *Undo* are shown as unnumbered extra sections.
- `> blockquotes` become highlighted tips or warnings.

### Command blocks

The code fence's info string is `language` followed by the OSes it applies to:

````md
```bash linux,macos
adb -s {{SERIAL}} shell
```

```powershell windows
adb -s {{SERIAL}} shell
```

```bash
# no OS listed = same command on every OS
adb devices -l
```

```output
{{SERIAL}}  device product:...
```

```bash linux title="Fedora / RHEL"
sudo dnf install android-tools
```
````

- Consecutive blocks are grouped. The visitor sees only the blocks for their selected OS.
- If a group has nothing for the selected OS, the page says *"Nothing to run on Windows for this part."*
- `output` blocks are shown as **Expected output** and have no copy button. They can be OS-specific too (`output windows`).
- `{{VAR}}` works in code blocks and in inline `` `code` ``.

## Quality bar

1. **Check every command against an official source**, and list it under `sources`. Update `verified` when you re-check.
2. Give each OS a working command, or explain why a step doesn't apply.
3. Show the expected output for steps where success isn't obvious.
4. Warn before destructive commands (`kill -9`, `rm -rf`, `-wipe-data`, `docker system prune`).
5. Run `npm run check:recipes` and `npm run build` before opening a pull request.

> **Changed a plugin in `src/plugins/`?** Astro caches rendered Markdown. Delete `node_modules/.astro/data-store.json` before rebuilding.
