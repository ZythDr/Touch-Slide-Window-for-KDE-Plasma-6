#!/usr/bin/env bash
set -euo pipefail

echo "Close System Settings before running this."
echo "This only removes old versioned Touch Slide shortcut rows. It does not reset current shortcuts."

if [ -f "$HOME/.config/kglobalshortcutsrc" ]; then
    cp "$HOME/.config/kglobalshortcutsrc" "$HOME/.config/kglobalshortcutsrc.bak-touchslide-cleanup"
    perl -0pi -e 's/^Touch Slide Window V[0-9]+:[^\n]*\n//mg' "$HOME/.config/kglobalshortcutsrc"
fi

echo "Done. Log out/in or reboot to let Plasma reload shortcut state."
echo "Remaining Touch Slide shortcut rows:"
grep -i "Touch Slide Window" "$HOME/.config/kglobalshortcutsrc" || true
