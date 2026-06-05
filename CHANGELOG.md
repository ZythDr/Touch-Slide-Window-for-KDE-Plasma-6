# Changelog

## 0.50.3 - 2026-06-05

- Added a MouseTiler-style local selector flow for gesture docking in the existing JavaScript KWin script: four small target tiles around the drag-start cursor.
- Added gesture selector settings: style, tile distance, tile size, and hover margin.
- Kept the existing edge-preview selector mode as a fallback.
- Added a titlebar-menu/shortcut action that opens the native Touch Slide Window KWin config dialog first, with the KWin Scripts manager and helper menu as fallbacks.
- Changed the titlebar-menu settings action to try the KWin Scripts settings page first, then fall back to the script-specific config dialog/helper.
- Grouped non-docking titlebar-menu actions under a More submenu while keeping Left/Right/Top/Bottom visible.
- Removed the override-capture titlebar action, shortcut registration, helper import command, and related docs.
- Stopped installing the fallback helper as a visible application-launcher entry and remove any old launcher entry during install.

## 0.50.1 - 2026-05-31

- Changed gesture feedback from a full revealed-window rectangle to a thin dock-edge target.
- Kept refreshing the gesture indicator while releasing the active drag would dock, even if move-step events pause.
- Documented the KWin Script limitation around Alt/Meta-held titlebar gestures and taskbar clicks.

## 0.50.0 - 2026-05-31

- Fixed gesture docking being cancelled when KWin removed an unrelated short-lived/internal window during outline display.
- Kept gesture cancellation for the real dragged target window being removed.

## 0.49.0 - 2026-05-31

- Fixed gesture and dock-hint settings not being loaded by the KWin script.
- Kept the gesture direction selected through diagonal drag jitter instead of clearing immediately.
- Refreshed KWin's outline overlay while gesture dragging continues.
- Fixed the v48 installer typo that wrote `Meta+Gown` for Dock Bottom.
- Kept the stable KPackage ID: `touch-slide-window`.

## 0.48.0 - 2026-05-31

- Added a gesture direction indicator using KWin's outline overlay.
- Showed the target dock/reveal geometry as soon as a gesture direction is selected.
- Added the Gestures tab setting for showing the direction indicator.
- Kept the gesture docking shortcut default at `Meta+G`.
