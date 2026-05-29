#!/usr/bin/env bash
set -euo pipefail

echo "Close System Settings before running this."

systemctl --user stop plasma-kglobalaccel.service >/dev/null 2>&1 || true
kquitapp6 kglobalaccel >/dev/null 2>&1 || true
sleep 1

if [ -f "$HOME/.config/kglobalshortcutsrc" ]; then
    cp "$HOME/.config/kglobalshortcutsrc" "$HOME/.config/kglobalshortcutsrc.bak-touchslide-cleanup"
    perl -0pi -e 's/^Touch Slide Window(?: V[0-9]+)?:[^\n]*\n//mg' "$HOME/.config/kglobalshortcutsrc"
fi

kwriteconfig6 --file kglobalshortcutsrc --group kwin --key "Touch Slide Window: Dock Left" "Meta+Ctrl+Alt+Left,none,Touch Slide Window: Dock Left"
kwriteconfig6 --file kglobalshortcutsrc --group kwin --key "Touch Slide Window: Dock Right" "Meta+Ctrl+Alt+Right,none,Touch Slide Window: Dock Right"
kwriteconfig6 --file kglobalshortcutsrc --group kwin --key "Touch Slide Window: Dock Top" "Meta+Ctrl+Alt+Up,none,Touch Slide Window: Dock Top"
kwriteconfig6 --file kglobalshortcutsrc --group kwin --key "Touch Slide Window: Dock Bottom" "Meta+Ctrl+Alt+Down,none,Touch Slide Window: Dock Bottom"
kwriteconfig6 --file kglobalshortcutsrc --group kwin --key "Touch Slide Window: Reload Settings" "Meta+Ctrl+Alt+R,none,Touch Slide Window: Reload Settings"
kwriteconfig6 --file kglobalshortcutsrc --group kwin --key "Touch Slide Window: Test Attention Poke" "Meta+Ctrl+Alt+P,none,Touch Slide Window: Test Attention Poke"
kwriteconfig6 --file kglobalshortcutsrc --group kwin --key "Touch Slide Window: Restore All" "Meta+Ctrl+Alt+U,none,Touch Slide Window: Restore All"

systemctl --user start plasma-kglobalaccel.service >/dev/null 2>&1 || true
systemctl --user restart plasma-kglobalaccel.service >/dev/null 2>&1 || true
qdbus6 org.kde.KWin /KWin reconfigure >/dev/null 2>&1 || true

echo "Done. Remaining Touch Slide shortcut rows:"
grep -i "Touch Slide Window" "$HOME/.config/kglobalshortcutsrc" || true
