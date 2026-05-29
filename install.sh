#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
DESKTOP_FILE="$HOME/.local/share/applications/touch-slide-window-settings.desktop"
BIN_DIR="$HOME/.local/bin"
TARGET_GROUP="Script-touch-slide-window"

OLD_IDS=(touch-slide-window touch-slide-window-v2 touch-slide-window-v3 touch-slide-window-v4 touch-slide-window-v5 touch-slide-window-v6 touch-slide-window-v7 touch-slide-window-v8 touch-slide-window-v9 touch-slide-window-v10 touch-slide-window-v11 touch-slide-window-v12 touch-slide-window-v13 touch-slide-window-v14 touch-slide-window-v15 touch-slide-window-v16 touch-slide-window-v17 touch-slide-window-v18 touch-slide-window-v19 touch-slide-window-v20 touch-slide-window-v21 touch-slide-window-v22 touch-slide-window-v23 touch-slide-window-v24 touch-slide-window-v25 touch-slide-window-v26 touch-slide-window-v27 touch-slide-window-v28 touch-slide-window-v29 touch-slide-window-v30 touch-slide-window-v31 touch-slide-window-v32 touch-slide-window-v33 touch-slide-window-v34 touch-slide-window-v35 touch-slide-window-v36 touch-slide-window-v37 touch-slide-window-v38 touch-slide-window-v39 touch-slide-window-v40 touch-slide-window-v41)

CONFIG_KEYS=(
  visibleStripPixels
  revealGap
  hoverMargin
  leaveMargin
  moveTolerance
  animate
  animationSteps
  animationIntervalMs
  dockToVirtualScreenEdges
  suppressMinimizeFallback
  allowMoveAlongDockEdge
  hideOnDockEdgeHit
  attentionPokeEnabled
  attentionPokeMode
  attentionPokePixels
  attentionPokeHoldMs
  attentionRepeatCount
  attentionPokeCooldownMs
  attentionAnimationSteps
  attentionAnimationIntervalMs
  resizeOnDockEnabled
  centerOnDockEnabled
  defaultResizeWidthValue
  defaultResizeHeightValue
  attentionPreviewCounter
  restoreAllCounter
  settingsCommand
  override01Enabled
  override01Name
  override01Match
  override01Target
  override01CenterEnabled
  override01ResizeEnabled
  override01WidthValue
  override01HeightValue
  override02Enabled
  override02Name
  override02Match
  override02Target
  override02CenterEnabled
  override02ResizeEnabled
  override02WidthValue
  override02HeightValue
  override03Enabled
  override03Name
  override03Match
  override03Target
  override03CenterEnabled
  override03ResizeEnabled
  override03WidthValue
  override03HeightValue
  override04Enabled
  override04Name
  override04Match
  override04Target
  override04CenterEnabled
  override04ResizeEnabled
  override04WidthValue
  override04HeightValue
  override05Enabled
  override05Name
  override05Match
  override05Target
  override05CenterEnabled
  override05ResizeEnabled
  override05WidthValue
  override05HeightValue
  override06Enabled
  override06Name
  override06Match
  override06Target
  override06CenterEnabled
  override06ResizeEnabled
  override06WidthValue
  override06HeightValue
  override07Enabled
  override07Name
  override07Match
  override07Target
  override07CenterEnabled
  override07ResizeEnabled
  override07WidthValue
  override07HeightValue
  override08Enabled
  override08Name
  override08Match
  override08Target
  override08CenterEnabled
  override08ResizeEnabled
  override08WidthValue
  override08HeightValue
  override09Enabled
  override09Name
  override09Match
  override09Target
  override09CenterEnabled
  override09ResizeEnabled
  override09WidthValue
  override09HeightValue
  override10Enabled
  override10Name
  override10Match
  override10Target
  override10CenterEnabled
  override10ResizeEnabled
  override10WidthValue
  override10HeightValue
  override11Enabled
  override11Name
  override11Match
  override11Target
  override11CenterEnabled
  override11ResizeEnabled
  override11WidthValue
  override11HeightValue
  override12Enabled
  override12Name
  override12Match
  override12Target
  override12CenterEnabled
  override12ResizeEnabled
  override12WidthValue
  override12HeightValue
  override13Enabled
  override13Name
  override13Match
  override13Target
  override13CenterEnabled
  override13ResizeEnabled
  override13WidthValue
  override13HeightValue
  override14Enabled
  override14Name
  override14Match
  override14Target
  override14CenterEnabled
  override14ResizeEnabled
  override14WidthValue
  override14HeightValue
  override15Enabled
  override15Name
  override15Match
  override15Target
  override15CenterEnabled
  override15ResizeEnabled
  override15WidthValue
  override15HeightValue
  override16Enabled
  override16Name
  override16Match
  override16Target
  override16CenterEnabled
  override16ResizeEnabled
  override16WidthValue
  override16HeightValue
  override17Enabled
  override17Name
  override17Match
  override17Target
  override17CenterEnabled
  override17ResizeEnabled
  override17WidthValue
  override17HeightValue
  override18Enabled
  override18Name
  override18Match
  override18Target
  override18CenterEnabled
  override18ResizeEnabled
  override18WidthValue
  override18HeightValue
  override19Enabled
  override19Name
  override19Match
  override19Target
  override19CenterEnabled
  override19ResizeEnabled
  override19WidthValue
  override19HeightValue
  override20Enabled
  override20Name
  override20Match
  override20Target
  override20CenterEnabled
  override20ResizeEnabled
  override20WidthValue
  override20HeightValue
  override21Enabled
  override21Name
  override21Match
  override21Target
  override21CenterEnabled
  override21ResizeEnabled
  override21WidthValue
  override21HeightValue
  override22Enabled
  override22Name
  override22Match
  override22Target
  override22CenterEnabled
  override22ResizeEnabled
  override22WidthValue
  override22HeightValue
  override23Enabled
  override23Name
  override23Match
  override23Target
  override23CenterEnabled
  override23ResizeEnabled
  override23WidthValue
  override23HeightValue
  override24Enabled
  override24Name
  override24Match
  override24Target
  override24CenterEnabled
  override24ResizeEnabled
  override24WidthValue
  override24HeightValue
  override25Enabled
  override25Name
  override25Match
  override25Target
  override25CenterEnabled
  override25ResizeEnabled
  override25WidthValue
  override25HeightValue
  override26Enabled
  override26Name
  override26Match
  override26Target
  override26CenterEnabled
  override26ResizeEnabled
  override26WidthValue
  override26HeightValue
  override27Enabled
  override27Name
  override27Match
  override27Target
  override27CenterEnabled
  override27ResizeEnabled
  override27WidthValue
  override27HeightValue
  override28Enabled
  override28Name
  override28Match
  override28Target
  override28CenterEnabled
  override28ResizeEnabled
  override28WidthValue
  override28HeightValue
  override29Enabled
  override29Name
  override29Match
  override29Target
  override29CenterEnabled
  override29ResizeEnabled
  override29WidthValue
  override29HeightValue
  override30Enabled
  override30Name
  override30Match
  override30Target
  override30CenterEnabled
  override30ResizeEnabled
  override30WidthValue
  override30HeightValue
  override31Enabled
  override31Name
  override31Match
  override31Target
  override31CenterEnabled
  override31ResizeEnabled
  override31WidthValue
  override31HeightValue
  override32Enabled
  override32Name
  override32Match
  override32Target
  override32CenterEnabled
  override32ResizeEnabled
  override32WidthValue
  override32HeightValue
  override33Enabled
  override33Name
  override33Match
  override33Target
  override33CenterEnabled
  override33ResizeEnabled
  override33WidthValue
  override33HeightValue
  override34Enabled
  override34Name
  override34Match
  override34Target
  override34CenterEnabled
  override34ResizeEnabled
  override34WidthValue
  override34HeightValue
  override35Enabled
  override35Name
  override35Match
  override35Target
  override35CenterEnabled
  override35ResizeEnabled
  override35WidthValue
  override35HeightValue
  override36Enabled
  override36Name
  override36Match
  override36Target
  override36CenterEnabled
  override36ResizeEnabled
  override36WidthValue
  override36HeightValue
  override37Enabled
  override37Name
  override37Match
  override37Target
  override37CenterEnabled
  override37ResizeEnabled
  override37WidthValue
  override37HeightValue
  override38Enabled
  override38Name
  override38Match
  override38Target
  override38CenterEnabled
  override38ResizeEnabled
  override38WidthValue
  override38HeightValue
  override39Enabled
  override39Name
  override39Match
  override39Target
  override39CenterEnabled
  override39ResizeEnabled
  override39WidthValue
  override39HeightValue
  override40Enabled
  override40Name
  override40Match
  override40Target
  override40CenterEnabled
  override40ResizeEnabled
  override40WidthValue
  override40HeightValue
  override41Enabled
  override41Name
  override41Match
  override41Target
  override41CenterEnabled
  override41ResizeEnabled
  override41WidthValue
  override41HeightValue
  override42Enabled
  override42Name
  override42Match
  override42Target
  override42CenterEnabled
  override42ResizeEnabled
  override42WidthValue
  override42HeightValue
  override43Enabled
  override43Name
  override43Match
  override43Target
  override43CenterEnabled
  override43ResizeEnabled
  override43WidthValue
  override43HeightValue
  override44Enabled
  override44Name
  override44Match
  override44Target
  override44CenterEnabled
  override44ResizeEnabled
  override44WidthValue
  override44HeightValue
  override45Enabled
  override45Name
  override45Match
  override45Target
  override45CenterEnabled
  override45ResizeEnabled
  override45WidthValue
  override45HeightValue
  override46Enabled
  override46Name
  override46Match
  override46Target
  override46CenterEnabled
  override46ResizeEnabled
  override46WidthValue
  override46HeightValue
  override47Enabled
  override47Name
  override47Match
  override47Target
  override47CenterEnabled
  override47ResizeEnabled
  override47WidthValue
  override47HeightValue
  override48Enabled
  override48Name
  override48Match
  override48Target
  override48CenterEnabled
  override48ResizeEnabled
  override48WidthValue
  override48HeightValue
  override49Enabled
  override49Name
  override49Match
  override49Target
  override49CenterEnabled
  override49ResizeEnabled
  override49WidthValue
  override49HeightValue
  override50Enabled
  override50Name
  override50Match
  override50Target
  override50CenterEnabled
  override50ResizeEnabled
  override50WidthValue
  override50HeightValue
)

echo "Close System Settings before running this, or it may rewrite shortcut entries."

echo "Preserving latest existing Touch Slide settings, if found..."
MIGRATE_FILE="$(mktemp)"
LEGACY_FIT_PERCENT=""

for group in Script-touch-slide-window Script-touch-slide-window-v41 Script-touch-slide-window-v40 Script-touch-slide-window-v39 Script-touch-slide-window-v38 Script-touch-slide-window-v37 Script-touch-slide-window-v36 Script-touch-slide-window-v35 Script-touch-slide-window-v34 Script-touch-slide-window-v33 Script-touch-slide-window-v32 Script-touch-slide-window-v31 Script-touch-slide-window-v30 Script-touch-slide-window-v29 Script-touch-slide-window-v28 Script-touch-slide-window-v27 Script-touch-slide-window-v26 Script-touch-slide-window-v25 Script-touch-slide-window-v24 Script-touch-slide-window-v23 Script-touch-slide-window-v22 Script-touch-slide-window-v21 Script-touch-slide-window-v20 Script-touch-slide-window-v19 Script-touch-slide-window-v18 Script-touch-slide-window-v17 Script-touch-slide-window-v16 Script-touch-slide-window-v15 Script-touch-slide-window-v14; do
    test_value="$(kreadconfig6 --file kwinrc --group "$group" --key visibleStripPixels 2>/dev/null || true)"
    if [ -n "$test_value" ]; then
        LEGACY_FIT_PERCENT="$(kreadconfig6 --file kwinrc --group "$group" --key fitOnDockPercent 2>/dev/null || true)"
        for key in "${CONFIG_KEYS[@]}"; do
            val="$(kreadconfig6 --file kwinrc --group "$group" --key "$key" 2>/dev/null || true)"
            if [ -n "$val" ]; then
                printf '%s=%s\n' "$key" "$val" >> "$MIGRATE_FILE"
            fi
        done
        echo "  Preserved settings from $group"
        break
    fi
done

echo "Stopping global shortcut service before editing shortcut config..."
systemctl --user stop plasma-kglobalaccel.service >/dev/null 2>&1 || true
kquitapp6 kglobalaccel >/dev/null 2>&1 || true
sleep 1

echo "Cleaning old Touch Slide KWin script packages..."
installed_packages="$(kpackagetool6 --type=KWin/Script --list 2>/dev/null || true)"
removed_any=false

for id in "${OLD_IDS[@]}"; do
    kwriteconfig6 --file kwinrc --group Plugins --key "${id}Enabled" false >/dev/null 2>&1 || true

    if printf '%s\n' "$installed_packages" | grep -Fxq "$id"; then
        if kpackagetool6 --type=KWin/Script --remove "$id" >/dev/null 2>&1; then
            echo "  Removed package: $id"
            removed_any=true
        fi
    fi

    if [ -d "$HOME/.local/share/kwin/scripts/$id" ]; then
        rm -rf "$HOME/.local/share/kwin/scripts/$id"
        echo "  Removed script directory: $id"
        removed_any=true
    fi
done

if [ "$removed_any" = false ]; then
    echo "  No old Touch Slide packages found."
fi

echo "Deleting stale Touch Slide shortcut rows..."
if [ -f "$HOME/.config/kglobalshortcutsrc" ]; then
    cp "$HOME/.config/kglobalshortcutsrc" "$HOME/.config/kglobalshortcutsrc.bak-touchslide-stable"
    perl -0pi -e 's/^Touch Slide Window(?: V[0-9]+)?:[^\n]*\n//mg' "$HOME/.config/kglobalshortcutsrc"
fi

echo "Deleting stale Touch Slide plugin enable rows and old config sections..."
if [ -f "$HOME/.config/kwinrc" ]; then
    cp "$HOME/.config/kwinrc" "$HOME/.config/kwinrc.bak-touchslide-stable"
    perl -0pi -e 's/^touch-slide-window(?:-v[0-9]+)?Enabled=[^\n]*\n//mg' "$HOME/.config/kwinrc"
    perl -0pi -e 's/^\[Script-touch-slide-window(?:-v[0-9]+)?(?:\]\[[^\]]+\])?\]\n(?:[^\[].*\n)*//mg' "$HOME/.config/kwinrc"
fi

echo "Writing defaults..."
"$SCRIPT_DIR/touchslide-config" defaults >/dev/null || true

echo "Restoring preserved settings..."
if [ -s "$MIGRATE_FILE" ]; then
    while IFS='=' read -r key val; do
        [ -n "$key" ] || continue
        kwriteconfig6 --file kwinrc --group "$TARGET_GROUP" --key "$key" "$val"
    done < "$MIGRATE_FILE"
fi
rm -f "$MIGRATE_FILE"

# Migrate the old single resize percentage to the new height default when no
# explicit V39 default height existed. Width stays 0 so side-docked behavior
# remains closest to previous versions.
if [ -n "$LEGACY_FIT_PERCENT" ] && [ -z "$(kreadconfig6 --file kwinrc --group "$TARGET_GROUP" --key defaultResizeHeightValue 2>/dev/null || true)" ]; then
    kwriteconfig6 --file kwinrc --group "$TARGET_GROUP" --key defaultResizeHeightValue "$LEGACY_FIT_PERCENT"
fi

kwriteconfig6 --file kwinrc --group "$TARGET_GROUP" --key settingsCommand "$SCRIPT_DIR/touchslide-settings"

echo "Installing settings desktop launcher..."
mkdir -p "$HOME/.local/share/applications" "$BIN_DIR"
ln -sfn "$SCRIPT_DIR/touchslide-settings" "$BIN_DIR/touchslide-settings"
ln -sfn "$SCRIPT_DIR/touchslide-config" "$BIN_DIR/touchslide-config"

cat > "$DESKTOP_FILE" <<EOF
[Desktop Entry]
Type=Application
Name=Touch Slide Window Settings
Comment=Configure Touch Slide Window
Exec=$SCRIPT_DIR/touchslide-settings
Icon=preferences-system-windows
Terminal=false
Categories=Settings;Utility;
EOF

chmod +x "$DESKTOP_FILE"
kbuildsycoca6 --noincremental >/dev/null 2>&1 || true

echo "Installing KWin script: Touch Slide Window..."
kpackagetool6 --type=KWin/Script --install "$SCRIPT_DIR" >/dev/null
kwriteconfig6 --file kwinrc --group Plugins --key touch-slide-windowEnabled true

echo "Writing stable Touch Slide shortcuts..."
kwriteconfig6 --file kglobalshortcutsrc --group kwin --key "Touch Slide Window: Dock Left" "Meta+Ctrl+Alt+Left,none,Touch Slide Window: Dock Left"
kwriteconfig6 --file kglobalshortcutsrc --group kwin --key "Touch Slide Window: Dock Right" "Meta+Ctrl+Alt+Right,none,Touch Slide Window: Dock Right"
kwriteconfig6 --file kglobalshortcutsrc --group kwin --key "Touch Slide Window: Dock Top" "Meta+Ctrl+Alt+Up,none,Touch Slide Window: Dock Top"
kwriteconfig6 --file kglobalshortcutsrc --group kwin --key "Touch Slide Window: Dock Bottom" "Meta+Ctrl+Alt+Down,none,Touch Slide Window: Dock Bottom"
kwriteconfig6 --file kglobalshortcutsrc --group kwin --key "Touch Slide Window: Reload Settings" "Meta+Ctrl+Alt+R,none,Touch Slide Window: Reload Settings"
kwriteconfig6 --file kglobalshortcutsrc --group kwin --key "Touch Slide Window: Test Attention Poke" "Meta+Ctrl+Alt+P,none,Touch Slide Window: Test Attention Poke"
kwriteconfig6 --file kglobalshortcutsrc --group kwin --key "Touch Slide Window: Restore All" "Meta+Ctrl+Alt+U,none,Touch Slide Window: Restore All"
kwriteconfig6 --file kglobalshortcutsrc --group kwin --key "Touch Slide Window: Open Settings Helper" ",none,Touch Slide Window: Open Settings Helper"
kwriteconfig6 --file kglobalshortcutsrc --group kwin --key "Touch Slide Window: Capture Override Info" ",none,Touch Slide Window: Capture Override Info"

systemctl --user start plasma-kglobalaccel.service >/dev/null 2>&1 || true
systemctl --user restart plasma-kglobalaccel.service >/dev/null 2>&1 || true
qdbus6 org.kde.KWin /KWin reconfigure >/dev/null 2>&1 || true

echo "Final shortcut cleanup pass..."
systemctl --user stop plasma-kglobalaccel.service >/dev/null 2>&1 || true
sleep 1
if [ -f "$HOME/.config/kglobalshortcutsrc" ]; then
    perl -0pi -e 's/^Touch Slide Window(?: V[0-9]+)?:[^\n]*\n//mg' "$HOME/.config/kglobalshortcutsrc"
fi
kwriteconfig6 --file kglobalshortcutsrc --group kwin --key "Touch Slide Window: Dock Left" "Meta+Ctrl+Alt+Left,none,Touch Slide Window: Dock Left"
kwriteconfig6 --file kglobalshortcutsrc --group kwin --key "Touch Slide Window: Dock Right" "Meta+Ctrl+Alt+Right,none,Touch Slide Window: Dock Right"
kwriteconfig6 --file kglobalshortcutsrc --group kwin --key "Touch Slide Window: Dock Top" "Meta+Ctrl+Alt+Up,none,Touch Slide Window: Dock Top"
kwriteconfig6 --file kglobalshortcutsrc --group kwin --key "Touch Slide Window: Dock Bottom" "Meta+Ctrl+Alt+Down,none,Touch Slide Window: Dock Bottom"
kwriteconfig6 --file kglobalshortcutsrc --group kwin --key "Touch Slide Window: Reload Settings" "Meta+Ctrl+Alt+R,none,Touch Slide Window: Reload Settings"
kwriteconfig6 --file kglobalshortcutsrc --group kwin --key "Touch Slide Window: Test Attention Poke" "Meta+Ctrl+Alt+P,none,Touch Slide Window: Test Attention Poke"
kwriteconfig6 --file kglobalshortcutsrc --group kwin --key "Touch Slide Window: Restore All" "Meta+Ctrl+Alt+U,none,Touch Slide Window: Restore All"
kwriteconfig6 --file kglobalshortcutsrc --group kwin --key "Touch Slide Window: Open Settings Helper" ",none,Touch Slide Window: Open Settings Helper"
kwriteconfig6 --file kglobalshortcutsrc --group kwin --key "Touch Slide Window: Capture Override Info" ",none,Touch Slide Window: Capture Override Info"
systemctl --user start plasma-kglobalaccel.service >/dev/null 2>&1 || true
systemctl --user restart plasma-kglobalaccel.service >/dev/null 2>&1 || true

echo
echo "Installed Touch Slide Window 0.42.0 with stable package ID: touch-slide-window"
echo "Recommended: log out/in or reboot once after this update."
