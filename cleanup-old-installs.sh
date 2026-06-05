#!/usr/bin/env bash
set -euo pipefail

OLD_IDS=(touch-slide-window-v2 touch-slide-window-v3 touch-slide-window-v4 touch-slide-window-v5 touch-slide-window-v6 touch-slide-window-v7 touch-slide-window-v8 touch-slide-window-v9 touch-slide-window-v10 touch-slide-window-v11 touch-slide-window-v12 touch-slide-window-v13 touch-slide-window-v14 touch-slide-window-v15 touch-slide-window-v16 touch-slide-window-v17 touch-slide-window-v18 touch-slide-window-v19 touch-slide-window-v20 touch-slide-window-v21 touch-slide-window-v22 touch-slide-window-v23 touch-slide-window-v24 touch-slide-window-v25 touch-slide-window-v26 touch-slide-window-v27 touch-slide-window-v28 touch-slide-window-v29 touch-slide-window-v30 touch-slide-window-v31 touch-slide-window-v32 touch-slide-window-v33 touch-slide-window-v34 touch-slide-window-v35 touch-slide-window-v36 touch-slide-window-v37 touch-slide-window-v38 touch-slide-window-v39 touch-slide-window-v40 touch-slide-window-v41 touch-slide-window-v42 touch-slide-window-v43 touch-slide-window-v44 touch-slide-window-v45 touch-slide-window-v46 touch-slide-window-v47 touch-slide-window-v48 touch-slide-window-v49)

echo "Close System Settings before running this."
echo "This optional cleanup backs up kwinrc/kglobalshortcutsrc, then removes old Touch Slide versioned entries."

installed_packages="$(kpackagetool6 --type=KWin/Script --list 2>/dev/null || true)"
removed_any=false

for id in "${OLD_IDS[@]}"; do
    kwriteconfig6 --file kwinrc --group Plugins --key "${id}Enabled" false >/dev/null 2>&1 || true

    if printf '%s\n' "$installed_packages" | grep -Fxq "$id"; then
        if kpackagetool6 --type=KWin/Script --remove "$id" >/dev/null 2>&1; then
            echo "Removed package: $id"
            removed_any=true
        fi
    fi

    if [ -d "$HOME/.local/share/kwin/scripts/$id" ]; then
        rm -rf "$HOME/.local/share/kwin/scripts/$id"
        echo "Removed script directory: $id"
        removed_any=true
    fi
done

if [ -f "$HOME/.config/kglobalshortcutsrc" ]; then
    cp "$HOME/.config/kglobalshortcutsrc" "$HOME/.config/kglobalshortcutsrc.bak-touchslide-cleanup"
    perl -0pi -e 's/^Touch Slide Window V[0-9]+:[^\n]*\n//mg' "$HOME/.config/kglobalshortcutsrc"
fi

if [ -f "$HOME/.config/kwinrc" ]; then
    cp "$HOME/.config/kwinrc" "$HOME/.config/kwinrc.bak-touchslide-cleanup"
    perl -0pi -e 's/^touch-slide-window-v[0-9]+Enabled=[^\n]*\n//mg' "$HOME/.config/kwinrc"
    perl -0pi -e 's/^\[Script-touch-slide-window-v[0-9]+(?:\]\[[^\]]+\])?\]\n(?:[^\[].*\n)*//mg' "$HOME/.config/kwinrc"
fi

if [ "$removed_any" = false ]; then
    echo "No old versioned Touch Slide packages found."
fi

echo "Cleanup done. Log out/in or reboot to let Plasma reload the cleaned state."
