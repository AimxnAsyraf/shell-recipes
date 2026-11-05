# Contributing a recipe

Every recipe is reviewed by the maintainer before it's published. There are two ways to submit one.

## Option 1: fill in the form (no Git needed)

1. Open **[Submit a new recipe](https://github.com/AimxnAsyraf/shell-recipes/issues/new?template=new-recipe.yml)** and fill it in.
2. The maintainer reviews it and may ask questions on the issue.
3. When it's approved (the maintainer adds the `approved` label), a bot converts the form into `src/recipes/<slug>.md` and opens a pull request. It runs the checks and a site build, and posts a link on your issue. If something is wrong, the bot comments with what to fix.
4. The maintainer reviews the pull request and its Cloudflare preview, then merges. Your recipe goes live as **Contributed by @you**.

## Option 2: open a pull request

Add one Markdown file to `src/recipes/` (copy [`docs/recipe-template.md`](docs/recipe-template.md)) and follow the format below. Every pull request needs the maintainer's approval (`.github/CODEOWNERS`).

## For the maintainer

- **Approve a form submission:** add the `approved` label to the issue. If the bot reports problems, ask the contributor to edit the issue, then remove and re-add the label.
- **Bot-opened pull requests:** GitHub holds their CI runs until someone with write access clicks **Approve workflows to run** in the merge box. The Cloudflare preview builds regardless.
- **Categories** live in `src/data/categories.json`. To add one, update that file **and** the dropdown in `.github/ISSUE_TEMPLATE/new-recipe.yml`. `npm run check:recipes` fails if they differ.
- **`verified`** is the date you checked the commands. The bot sets it to the approval date.

---

## Recipe format

A recipe is one Markdown file in `src/recipes/`. The file name becomes the URL: `src/recipes/install-docker.md` is served at `/r/install-docker/`.

Start by copying [`docs/recipe-template.md`](docs/recipe-template.md).

## Frontmatter

```yaml
---
title: Connect your desktop to an Android emulator with adb
summary: One or two sentences, shown on the card and under the title.
category: Mobile dev            # one of src/data/categories.json
tags: [android, adb, emulator]  # extra search keywords
difficulty: Beginner            # Beginner | Intermediate | Advanced
time: 15 min
os: [linux, macos, windows]     # OSes the recipe covers
verified: 2026-11-04            # date you last checked the commands (YYYY-MM-DD)
featured: true                  # optional, sorts first
author: your-github-username    # optional, shown as "Contributed by @you"
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

- Consecutive blocks are grouped. When a group has OS-specific blocks, its command header shows **Linux / macOS / Windows** tabs. Picking a tab switches every block on the page, so the visitor sees only their OS. Blocks with no OS listed show no tabs.
- If a group has nothing for the selected OS, the page says *"Nothing to run on Windows for this part."*
- `output` blocks are shown as **Expected output** and have no copy button. They can be OS-specific too (`output windows`).
- `{{VAR}}` works in code blocks, inline `` `code` `` and plain text (not inside link URLs).

## Quality bar

1. **Check every command against an official source**, and list it under `sources`. Update `verified` when you re-check.
2. Give each OS a working command, or explain why a step doesn't apply.
3. Show the expected output for steps where success isn't obvious.
4. Warn before destructive commands (`kill -9`, `rm -rf`, `-wipe-data`, `docker system prune`).
5. No raw HTML in the body, and links must be `https://`. Prerequisites may only use `<strong>`, `<em>`, `<code>` and `<kbd>`.
6. Run `npm run check:recipes` and `npm run build` before opening a pull request.

> **Changed a plugin in `src/plugins/`?** Astro caches rendered Markdown. Delete `node_modules/.astro/data-store.json` before rebuilding.
