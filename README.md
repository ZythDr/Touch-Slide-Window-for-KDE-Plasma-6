# Touch Slide Window 0.42.0

Stable-ID build.

Project repository:
https://github.com/ZythDr/Touch-Slide-Window-for-KDE-Plasma-6

Created:
2026-05-29

Inspired by:
Preme for Windows, specifically the workflow of sliding windows off-screen and revealing them from a visible edge.

Changes:
- Moves the GitHub link and project information to a new About tab.
- Adds version/date/repo/inspiration text to About.
- Centers the General/Animations form layouts more consistently.
- Makes the Overrides tab Match column expand with the window.
- Keeps compact override columns anchored to the right side of the table.
- Adds user-configurable shortcut entries:
  - Touch Slide Window: Capture Override Info
  - Touch Slide Window: Open Settings Helper
- Keeps stable package ID: `touch-slide-window`.
- Keeps cleanup for old versioned packages through `touch-slide-window-v41`.

Note:
The titlebar menu can capture override info, but KWin JavaScript cannot directly write KWin script config rows. Use:
`touchslide-config import-last-capture`
after capturing, or use the Touch Slide Window Settings helper import option.

Install:
```bash
./install.sh
```
