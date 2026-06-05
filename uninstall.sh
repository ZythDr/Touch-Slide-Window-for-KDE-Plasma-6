#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
DESKTOP_FILE="$HOME/.local/share/applications/touch-slide-window-settings.desktop"
OLD_IDS=(touch-slide-window touch-slide-window-v2 touch-slide-window-v3 touch-slide-window-v4 touch-slide-window-v5 touch-slide-window-v6 touch-slide-window-v7 touch-slide-window-v8 touch-slide-window-v9 touch-slide-window-v10 touch-slide-window-v11 touch-slide-window-v12 touch-slide-window-v13 touch-slide-window-v14 touch-slide-window-v15 touch-slide-window-v16 touch-slide-window-v17 touch-slide-window-v18 touch-slide-window-v19 touch-slide-window-v20 touch-slide-window-v21 touch-slide-window-v22 touch-slide-window-v23 touch-slide-window-v24 touch-slide-window-v25 touch-slide-window-v26 touch-slide-window-v27 touch-slide-window-v28 touch-slide-window-v29 touch-slide-window-v30 touch-slide-window-v31 touch-slide-window-v32 touch-slide-window-v33 touch-slide-window-v34 touch-slide-window-v35 touch-slide-window-v36 touch-slide-window-v37 touch-slide-window-v38 touch-slide-window-v39 touch-slide-window-v40 touch-slide-window-v41 touch-slide-window-v42 touch-slide-window-v43 touch-slide-window-v44 touch-slide-window-v45 touch-slide-window-v46 touch-slide-window-v47 touch-slide-window-v48 touch-slide-window-v49)

echo "Uninstalling Touch Slide Window without live KWin reloads."
echo "If any windows are docked, restore them before uninstalling or log out/in after uninstalling."

installed_packages="$(kpackagetool6 --type=KWin/Script --list 2>/dev/null || true)"
for id in "${OLD_IDS[@]}"; do
    kwriteconfig6 --file kwinrc --group Plugins --key "${id}Enabled" false >/dev/null 2>&1 || true
    if printf '%s\n' "$installed_packages" | grep -Fxq "$id"; then
        kpackagetool6 --type=KWin/Script --remove "$id" >/dev/null 2>&1 || true
    fi
    rm -rf "$HOME/.local/share/kwin/scripts/$id"
done

rm -f "$DESKTOP_FILE"
if [ "$(readlink "$HOME/.local/bin/touchslide-settings" 2>/dev/null || true)" = "$SCRIPT_DIR/touchslide-settings" ]; then
    rm -f "$HOME/.local/bin/touchslide-settings"
fi
if [ "$(readlink "$HOME/.local/bin/touchslide-config" 2>/dev/null || true)" = "$SCRIPT_DIR/touchslide-config" ]; then
    rm -f "$HOME/.local/bin/touchslide-config"
fi

echo "Removed Touch Slide Window scripts, helper commands, and old settings launcher if present."
echo "Log out/in or reboot to let Plasma reload the removed state."
echo "If stale shortcut/config entries remain, run ./cleanup-old-installs.sh manually."
