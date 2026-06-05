# Touch Slide Window for KDE Plasma 6

A small experimental **KWin Script** for KDE Plasma 6 that lets you “dock” windows just off-screen, leaving only a small visible strip. Hover the strip or focus the window again and it slides back into view.

This was inspired by a feature I missed from the Windows app **Preme for Windows**, specifically its “Touch Slide Window” behavior.

## What it does

Touch Slide Window lets you:

- dock a window to the left/right/top/bottom edge of the screen
- leave a small visible strip while the window is hidden off-screen
- reveal the docked window on hover
- reveal docked windows when Alt-Tabbing to them
- hide them again when the cursor leaves
- optionally resize/center windows when docking
- set per-app/window override rules
- dock by a shortcut-armed drag gesture
- trigger a small notification/attention “poke” animation for docked apps

This is mostly meant as an Alt-Tab companion for apps you want quick access to without keeping them fully visible.

## Requirements

- KDE Plasma 6
- KWin on Wayland
- `kpackagetool6`
- `qdbus6`
- `kwriteconfig6`
- `kreadconfig6`

Tested on CachyOS / Arch-based Plasma 6 setups.

## Install

Download the latest zip release, then:

```bash
cd ~/Code
rm -rf touch-slide-window
unzip ~/Downloads/touch-slide-window.zip
cd touch-slide-window
./install.sh
```

After installing, log out/in or reboot once.

Then enable it here if needed:

```text
System Settings → Window Management → KWin Scripts → Touch Slide Window
```

## Default shortcuts

```text
Meta + Ctrl + Alt + Left   Dock left
Meta + Ctrl + Alt + Right  Dock right
Meta + Ctrl + Alt + Up     Dock top
Meta + Ctrl + Alt + Down   Dock bottom
Meta + G                   Arm gesture dock
Meta + Ctrl + Alt + R      Reload settings
Meta + Ctrl + Alt + P      Preview notification poke
Meta + Ctrl + Alt + U      Restore all docked windows
```

You can change or unbind these in:

```text
System Settings → Keyboard → Shortcuts → Window Management
```

Look for entries starting with:

```text
Touch Slide Window
```

## Basic usage

1. Focus a normal window.
2. Press one of the dock shortcuts, for example:

```text
Meta + Ctrl + Alt + Right
```

3. The window moves mostly off-screen, leaving a small strip visible.
4. Hover the strip to reveal it.
5. Move the cursor away and it hides again.

You can also use the titlebar context menu:

```text
Right-click titlebar → Touch Slide Window
```

From there you can dock, undock, arm gesture docking, reload settings, preview the notification poke, or restore all docked windows.

## Gesture Docking

Gesture docking is shortcut-armed by default so normal titlebar dragging is not hijacked.

1. Press `Meta + G`.
2. Drag a titlebar or window over one of the local selector tiles near the drag-start cursor.
3. Release the drag while a tile is selected.

The default selector style is now a cursor-local popup tile selector (left/right/top/bottom) so you do not need to move all the way to a screen edge. The old edge-preview style is still available in Gestures settings.

`Alt + left-drag` can also work if KDE's Window Actions setting maps that input to moving windows and Gesture Docking uses Activation mode `1`. KWin scripts only receive the resulting interactive move; they cannot reliably tell that Alt, Meta, or a taskbar click caused it.

## Settings

Configure it from:

```text
System Settings → Window Management → KWin Scripts → Touch Slide Window → Configure
```

The main settings include:

- visible strip size
- reveal gap
- hover/leave margins
- slide animation speed
- dock hint behavior
- gesture docking behavior
- notification poke behavior
- resize/center-on-dock behavior
- per-app/window overrides

After changing settings, click **Apply**, then reload with:

```text
Meta + Ctrl + Alt + R
```

or:

```text
Right-click titlebar → Touch Slide Window → Reload Settings
```

## Per-app overrides

The **Overrides** tab lets you create rules for specific apps/windows.

Columns:

```text
On      Enable the rule
Name    Friendly label only
Match   Text to match
T       Match type
C       Center when docked
S       Resize when docked
W       Width target
H       Height target
```

Match type:

```text
0 = class/resource
1 = title
2 = class/resource OR title
3 = class/resource AND title
```

Width/height values:

```text
0     keep current size
1-100 percent of monitor work area
101+  pixels
```

First enabled matching row wins.

## Helper commands

The installer adds helper commands if possible:

```bash
touchslide-config list
touchslide-config reload
touchslide-config preview
touchslide-config restore-all
touchslide-config gui
touchslide-settings
```

`touchslide-config gui` opens the native KWin script config dialog when Plasma exposes it. `touchslide-settings` is only a fallback helper and is not installed as an app-launcher entry.

## Changelog

Release notes are kept in [CHANGELOG.md](CHANGELOG.md).

## Uninstall

From the extracted folder:

```bash
./uninstall.sh
```

This attempts to restore docked windows, remove the script, remove shortcut entries, and clean up old versioned installs.

## Notes

This is experimental and uses KWin’s JavaScript scripting API. Some things are limited by what KWin scripts can access. For example, the script can read its own config, register shortcuts, move windows, add titlebar menu actions, and request KDE to open the native config dialog, but it cannot directly write config rows from inside the KWin titlebar menu action.

If something behaves weirdly after installing or updating, log out/in or reboot once. KWin can keep old script instances around until the session restarts.
