---
title: Connect your desktop to an Android emulator with adb
summary: Install adb, start an Android Virtual Device from the terminal, connect to it, install an APK, open a shell, and let the emulator reach a dev server on your machine.
category: Mobile dev
tags: [android, adb, emulator, avd, apk, platform-tools, react native, flutter, mobile]
difficulty: Beginner
time: 15 min
os: [linux, macos, windows]
verified: 2026-11-04
featured: true
prerequisites:
  - Android Studio installed, <strong>or</strong> the standalone SDK Platform-Tools plus the emulator package
  - At least one virtual device (AVD) created in Android Studio's <em>Device Manager</em>
  - Hardware virtualization turned on (KVM on Linux, WHPX on Windows, HVF on macOS)
variables:
  - key: AVD_NAME
    label: Virtual device (AVD) name
    default: Pixel_8_API_35
    hint: From step 4 (emulator -list-avds)
  - key: SERIAL
    label: Emulator serial
    default: emulator-5554
    hint: From step 6 (adb devices). The first emulator is emulator-5554.
  - key: APK_PATH
    label: Path to your APK
    default: app/build/outputs/apk/debug/app-debug.apk
  - key: DEV_PORT
    label: Dev server port on your desktop
    default: "8081"
    hint: e.g. 8081 for React Native Metro, 3000 for a web/API server
sources:
  - title: Android Debug Bridge (adb)
    url: https://developer.android.com/tools/adb
    publisher: Android Developers
  - title: Start the emulator from the command line
    url: https://developer.android.com/studio/run/emulator-commandline
    publisher: Android Developers
  - title: SDK Platform-Tools release notes (latest 37.0.1)
    url: https://developer.android.com/tools/releases/platform-tools
    publisher: Android Developers
    date: July 2026
  - title: Environment variables (ANDROID_HOME)
    url: https://developer.android.com/tools/variables
    publisher: Android Developers
  - title: Send emulator console commands (adb emu kill)
    url: https://developer.android.com/studio/run/emulator-console
    publisher: Android Developers
  - title: adb reverse (community reference; also listed in `adb --help`)
    url: https://linuxcommandlibrary.com/man/adb-reverse
    publisher: LinuxCommandLibrary
  - title: Android CLI, android emulator start
    url: https://developer.android.com/tools/agents/android-cli/commands/emulator_start
    publisher: Android Developers
    date: Page updated 2026-10-28
---

`adb` (Android Debug Bridge) is how your desktop talks to an Android device. An emulator counts as a device. Once it's connected you can install apps, read logs, open a shell, and forward ports.

> **Already have Android Studio?** It ships `adb` and the emulator inside your Android SDK. You can skip downloading in step 1 and just add them to your `PATH` in step 2.

## Get adb (SDK Platform-Tools)

If you don't use Android Studio, download Google's standalone Platform-Tools package (latest is **37.0.1**, July 2026) and unzip it.

```bash linux
cd ~
curl -LO https://dl.google.com/android/repository/platform-tools-latest-linux.zip
unzip platform-tools-latest-linux.zip
# adb is now in ~/platform-tools/
```

```zsh macos
cd ~
curl -LO https://dl.google.com/android/repository/platform-tools-latest-darwin.zip
unzip platform-tools-latest-darwin.zip
# adb is now in ~/platform-tools/
```

```powershell windows
cd $HOME
curl.exe -LO https://dl.google.com/android/repository/platform-tools-latest-windows.zip
Expand-Archive .\platform-tools-latest-windows.zip -DestinationPath $HOME
# adb.exe is now in $HOME\platform-tools\
```

> The emulator itself is **not** in Platform-Tools. Install it in Android Studio under *SDK Manager → SDK Tools → Android Emulator*.

## Put adb and the emulator on your PATH

Point `ANDROID_HOME` at your SDK folder and add `platform-tools` and `emulator` to `PATH`. The paths below are Android Studio's default SDK locations. Change them if you installed the SDK somewhere else.

```bash linux
echo 'export ANDROID_HOME="$HOME/Android/Sdk"' >> ~/.bashrc
echo 'export PATH="$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator"' >> ~/.bashrc
source ~/.bashrc
```

```zsh macos
echo 'export ANDROID_HOME="$HOME/Library/Android/sdk"' >> ~/.zprofile
echo 'export PATH="$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator"' >> ~/.zprofile
source ~/.zprofile
```

```powershell windows
$sdk = "$env:LOCALAPPDATA\Android\Sdk"
[Environment]::SetEnvironmentVariable("ANDROID_HOME", $sdk, "User")
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
[Environment]::SetEnvironmentVariable("Path", "$userPath;$sdk\platform-tools;$sdk\emulator", "User")
# Close and reopen Windows Terminal so the new PATH is picked up.
```

> Used the standalone zip from step 1 with no Android Studio? Add `~/platform-tools` (Windows: `$HOME\platform-tools`) to `PATH` instead.

## Check that adb works

```bash
adb version
```

```output
Android Debug Bridge version 1.0.41
Version 37.0.1-...
Installed as /.../platform-tools/adb
```

## Find your virtual device's name

List the AVDs you've created. Copy the one you want into **Your values → Virtual device (AVD) name**.

```bash
emulator -list-avds
```

```output
Pixel_8_API_35
Medium_Phone_API_36
```

> **Linux:** check that hardware acceleration (KVM) is available with `emulator -accel-check`. Without it the emulator is very slow or won't start.

## Start the emulator

Run this in its **own terminal tab**. It keeps running while the emulator is open.

```bash
emulator -avd {{AVD_NAME}}
```

Useful options: `-no-snapshot-load` for a cold boot, `-wipe-data` to factory-reset the device, and `-no-window` to run headless on a server or in CI.

> **Newer option:** Google now marks the standalone `emulator` tool as deprecated in favour of the **Android CLI**. If you have it installed, `android emulator list` and `android emulator start {{AVD_NAME}}` do the same thing (add `--headless` for no window).

## Confirm adb sees the emulator

In a second terminal:

```bash
adb devices -l
```

```output
List of devices attached
{{SERIAL}}          device product:sdk_gphone64_x86_64 model:sdk_gphone64_x86_64 device:emu64xa transport_id:1
```

If it says `offline`, wait for the emulator to finish booting. Each emulator uses two ports: a console port (5554) and an adb port (5555). A second emulator gets 5556/5557, and so on, so its serial is `emulator-5556`.

## Install your app

Use `-s` to choose the device when more than one is connected.

```bash
adb -s {{SERIAL}} install {{APK_PATH}}
```

```output
Performing Streamed Install
Success
```

## Open a shell, read logs, take a screenshot

```bash
# Interactive shell on the device (type `exit` to leave)
adb -s {{SERIAL}} shell

# Live logs (Ctrl+C to stop)
adb -s {{SERIAL}} logcat

# Screenshot straight to your desktop
adb -s {{SERIAL}} exec-out screencap -p > screen.png
```

```powershell windows
# Interactive shell on the device (type `exit` to leave)
adb -s {{SERIAL}} shell

# Live logs (Ctrl+C to stop)
adb -s {{SERIAL}} logcat

# Screenshot: save on the device, then pull it to your PC
adb -s {{SERIAL}} shell screencap /sdcard/screen.png
adb -s {{SERIAL}} pull /sdcard/screen.png .
```

> On Windows, PowerShell's `>` can corrupt binary data, so the screenshot is saved on the device first and then copied with `adb pull`.

## Let the emulator reach a server on your desktop

Run your dev server (Metro, Vite, an API…) on your desktop. Then `adb reverse` makes `localhost:{{DEV_PORT}}` *inside the emulator* point to the same port on your desktop.

```bash
adb -s {{SERIAL}} reverse tcp:{{DEV_PORT}} tcp:{{DEV_PORT}}
adb -s {{SERIAL}} reverse --list
```

```output
UsbFfs tcp:{{DEV_PORT}} tcp:{{DEV_PORT}}
```

Reverse rules need Android 5.0+ and are lost when the emulator restarts or the adb server restarts, so run this again after either. The opposite direction also works. `adb forward tcp:6100 tcp:7100` sends your desktop's port 6100 to port 7100 on the device.

## Troubleshooting

**`adb: command not found` / `'adb' is not recognized`**: your `PATH` change hasn't loaded. Open a new terminal, or run `source ~/.bashrc` (Linux) or `source ~/.zprofile` (macOS).

**The emulator is running but not in `adb devices`**: restart the adb server:

```bash
adb kill-server
adb start-server
adb devices
```

**`more than one device/emulator`**: add `-s {{SERIAL}}` to the command, or set `ANDROID_SERIAL={{SERIAL}}` for the session.

**The emulator won't start on Linux**: run `emulator -accel-check`. If KVM isn't available, turn on virtualization (VT-x/AMD-V) in your BIOS/UEFI.

## Clean up

```bash
# Remove port reverses and stop the emulator
adb -s {{SERIAL}} reverse --remove-all
adb -s {{SERIAL}} emu kill
```
