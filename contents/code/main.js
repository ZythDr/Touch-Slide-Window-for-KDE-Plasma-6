
/*
 * Touch Slide Window - experimental KWin script for Plasma 6.
 *
 * 0.50.4 stable-ID build:
 * - Prevents unrelated internal window removal from cancelling gesture docking.
 * - Keeps the v49 gesture settings load and outline refresh fixes.
 * - Keeps stable package ID: touch-slide-window.
 * - Adds cursor-centered local selector tiles for gesture docking (MouseTiler-style flow).
 */

/* ===== Defaults; values are reloaded from KWin script config at runtime ===== */
var VISIBLE_STRIP_PIXELS = 10;    // How much of the hidden window remains visible.
var REVEAL_GAP = 8;               // Gap between revealed window and screen edge. Set 0 for flush edge.
var HOVER_MARGIN = 5;             // Extra hover tolerance around the hidden strip.
var LEAVE_MARGIN = 8;             // Extra tolerance before hiding a revealed window.
var MOVE_TOLERANCE = 40;          // Geometry tolerance for detecting manual movement.
var ANIMATE = true;
var ANIM_STEPS = 12;
var ANIM_INTERVAL_MS = 14;
var SUPPRESS_FOCUS_REVEAL_IF_LAST_NORMAL_WAS_MINIMIZED = true;
var DOCK_TO_VIRTUAL_SCREEN_EDGES = true;

/* Notification / taskbar attention poke settings. */
var ATTENTION_POKE_ENABLED = true;
var ATTENTION_POKE_MODE = 0;      // Deprecated; kept only for old config migration.
var ATTENTION_POKE_PIXELS = 20;
var ATTENTION_POKE_HOLD_MS = 1200;
var ATTENTION_REPEAT_COUNT = 2;
var ATTENTION_POKE_COOLDOWN_MS = 2000;
var ATTENTION_ANIM_STEPS = 6;
var ATTENTION_ANIM_INTERVAL_MS = 14;

/*
 * Optional edge-aware fit/center when initially docking.
 * left/right: fit height to percent of current monitor work area.
 * top/bottom: fit width to percent of current monitor work area.
 */
var RESIZE_ON_DOCK_ENABLED = false;
var CENTER_ON_DOCK_ENABLED = false;
var DEFAULT_RESIZE_WIDTH_VALUE = 0;
var DEFAULT_RESIZE_HEIGHT_VALUE = 90;
var ALLOW_MOVE_ALONG_DOCK_EDGE = true;
var HIDE_ON_DOCK_EDGE_HIT = false;
var DOCK_EDGE_HIT_MARGIN = 4;
var APP_OVERRIDES = [];
/* =================================== */

var stowed = [];
var lastNonDockedFocus = null;
var lastFullscreenFocus = null;
var suppressActivationHandling = false;
var suppressFocusRevealUntil = 0;
var suppressFocusRevealReason = "";
var closedSignalConnected = {};
var attentionSignalConnected = {};
var lastSettingsSignature = "";
var lastAttentionPreviewCounter = -1;
var lastRestoreAllCounter = -1;
var settingsPollTimer = null;

var GESTURE_DOCK_ENABLED = false;
var GESTURE_DOCK_MODE = 1; // 0=armed shortcut only, 1=any interactive move
var GESTURE_DOCK_THRESHOLD_PX = 20;
var GESTURE_DOCK_TIMEOUT_MS = 2500;
var GESTURE_DOCK_CONE_DEGREES = 35;
var GESTURE_INDICATOR_ENABLED = true;
var GESTURE_SELECTOR_MODE = 1; // 0=edge strip preview, 1=cursor-centered popup tiles
var GESTURE_SELECTOR_DISTANCE_PX = 78;
var GESTURE_SELECTOR_TILE_SIZE_PX = 54;
var GESTURE_SELECTOR_MARGIN_PX = 10;
var DOCK_HINT_MODE = 2; // 0=instant hidden, 1=animate to hidden, 2=show then stow, 3=attention poke after dock
var DOCK_HINT_DELAY_MS = 500;
var gestureArmedUntil = 0;
var gestureActive = null;
var gestureConnected = {};
var gestureIndicatorAvailable = true;
var gestureIndicatorRefreshTimer = null;
var GESTURE_INDICATOR_REFRESH_MS = 80;

var focusRevealTimer = null;
var pendingFocusRevealEntry = null;
var pendingFocusRevealPrevious = null;
var FOCUS_REVEAL_DELAY_MS = 220;
var NEW_WINDOW_SUPPRESS_MS = 1500;

function log(msg) { print("[TouchSlideWindow] " + msg); }

function asBool(v, fallback) {
    if (v === undefined || v === null) return fallback;
    if (typeof v === "boolean") return v;
    var s = String(v).toLowerCase();
    return s === "true" || s === "1" || s === "yes";
}

function asInt(v, fallback, minValue, maxValue) {
    var n = parseInt(v);
    if (isNaN(n)) n = fallback;
    if (minValue !== undefined && n < minValue) n = minValue;
    if (maxValue !== undefined && n > maxValue) n = maxValue;
    return n;
}



function stringValue(v) {
    if (v === undefined || v === null) return "";
    return String(v);
}

function trimValue(v) {
    return stringValue(v).replace(/^\s+|\s+$/g, "");
}

function lowerValue(v) {
    return trimValue(v).toLowerCase();
}

function windowClassText(win) {
    var parts = [];
    try { if (win.resourceClass) parts.push(String(win.resourceClass)); } catch (e1) {}
    try { if (win.resourceName) parts.push(String(win.resourceName)); } catch (e2) {}
    return parts.join(" ").toLowerCase();
}

function windowTitleText(win) {
    try { return String(win.caption || "").toLowerCase(); } catch (e) {}
    return "";
}


function isFullscreenWindow(win) {
    try { return !!win.fullScreen; } catch (e) {}
    return false;
}

function rememberNonDockedFocus(win, reason) {
    if (!win || !isFocusableWindow(win) || isDockedWindow(win)) return;

    lastNonDockedFocus = win;

    if (isFullscreenWindow(win)) {
        lastFullscreenFocus = win;
        log("Fullscreen focus remembered (" + reason + "): " + win.caption);
    }

    connectCloseSuppressor(win);
}

function staticOverrideKey(slot, suffix) {
    var n = slot < 10 ? "0" + slot : String(slot);
    return "override" + n + suffix;
}

function readStaticOverrideSlot(slot) {
    var enabled = asBool(readConfig(staticOverrideKey(slot, "Enabled"), false), false);
    if (!enabled) return null;

    var match = lowerValue(readConfig(staticOverrideKey(slot, "Match"), ""));
    if (match === "") return null;

    return {
        slot: slot,
        name: trimValue(readConfig(staticOverrideKey(slot, "Name"), "Rule " + slot)),
        match: match,
        target: asInt(readConfig(staticOverrideKey(slot, "Target"), 0), 0, 0, 3),
        center: asBool(readConfig(staticOverrideKey(slot, "CenterEnabled"), false), false),
        resize: asBool(readConfig(staticOverrideKey(slot, "ResizeEnabled"), false), false),
        widthValue: asInt(readConfig(staticOverrideKey(slot, "WidthValue"), 0), 0, 0, 9999),
        heightValue: asInt(readConfig(staticOverrideKey(slot, "HeightValue"), 0), 0, 0, 9999)
    };
}

function loadAppOverrides() {
    var rules = [];

    for (var i = 1; i <= 50; i++) {
        var r = readStaticOverrideSlot(i);
        if (r) rules.push(r);
    }

    return rules;
}

function appOverridesSignature() {
    var parts = [];
    for (var i = 0; i < APP_OVERRIDES.length; i++) {
        var r = APP_OVERRIDES[i];
        parts.push([
            r.slot,
            r.name,
            r.match,
            r.target,
            r.center,
            r.resize,
            r.widthValue,
            r.heightValue
        ].join(","));
    }
    return parts.join(";");
}

function overrideMatchesWindow(rule, win) {
    if (!rule || !win) return false;

    var cls = windowClassText(win);
    var title = windowTitleText(win);
    var m = rule.match;

    if (m === "") return false;

    /*
     * target:
     * 0 = class/resource
     * 1 = title/caption
     * 2 = class/resource OR title/caption
     * 3 = class/resource AND title/caption
     */
    if (rule.target === 0) return cls.indexOf(m) >= 0;
    if (rule.target === 1) return title.indexOf(m) >= 0;
    if (rule.target === 2) return cls.indexOf(m) >= 0 || title.indexOf(m) >= 0;
    if (rule.target === 3) return cls.indexOf(m) >= 0 && title.indexOf(m) >= 0;

    return false;
}

function overrideForWindow(win) {
    if (!win) return null;

    for (var i = 0; i < APP_OVERRIDES.length; i++) {
        var r = APP_OVERRIDES[i];
        if (overrideMatchesWindow(r, win)) return r;
    }

    return null;
}

function dockAdjustmentForWindow(win) {
    var r = overrideForWindow(win);
    if (r) {
        return {
            source: "override " + r.slot + " " + r.name,
            resize: r.resize,
            center: r.center,
            widthValue: r.widthValue,
            heightValue: r.heightValue
        };
    }
    return {
        source: "global",
        resize: RESIZE_ON_DOCK_ENABLED,
        center: CENTER_ON_DOCK_ENABLED,
        widthValue: DEFAULT_RESIZE_WIDTH_VALUE,
        heightValue: DEFAULT_RESIZE_HEIGHT_VALUE
    };
}

function dimensionFromOverrideValue(value, monitorSize, currentSize) {
    value = asInt(value, 0, 0, 9999);

    if (value <= 0) return currentSize;

    if (value <= 100) {
        return Math.max(1, Math.round(monitorSize * (value / 100.0)));
    }

    return Math.max(1, Math.min(value, monitorSize));
}

function settingsSignature() {
    return [
        VISIBLE_STRIP_PIXELS,
        REVEAL_GAP,
        HOVER_MARGIN,
        LEAVE_MARGIN,
        MOVE_TOLERANCE,
        ANIMATE,
        ANIM_STEPS,
        ANIM_INTERVAL_MS,
        SUPPRESS_FOCUS_REVEAL_IF_LAST_NORMAL_WAS_MINIMIZED,
        DOCK_TO_VIRTUAL_SCREEN_EDGES,
        DOCK_HINT_MODE,
        DOCK_HINT_DELAY_MS,
        GESTURE_DOCK_ENABLED,
        GESTURE_DOCK_MODE,
        GESTURE_DOCK_THRESHOLD_PX,
        GESTURE_DOCK_TIMEOUT_MS,
        GESTURE_DOCK_CONE_DEGREES,
        GESTURE_INDICATOR_ENABLED,
        GESTURE_SELECTOR_MODE,
        GESTURE_SELECTOR_DISTANCE_PX,
        GESTURE_SELECTOR_TILE_SIZE_PX,
        GESTURE_SELECTOR_MARGIN_PX,
        ATTENTION_POKE_ENABLED,
        ATTENTION_POKE_MODE,
        ATTENTION_POKE_PIXELS,
        ATTENTION_POKE_HOLD_MS,
        ATTENTION_REPEAT_COUNT,
        ATTENTION_POKE_COOLDOWN_MS,
        ATTENTION_ANIM_STEPS,
        ATTENTION_ANIM_INTERVAL_MS,
        RESIZE_ON_DOCK_ENABLED,
        CENTER_ON_DOCK_ENABLED,
        DEFAULT_RESIZE_WIDTH_VALUE,
        DEFAULT_RESIZE_HEIGHT_VALUE,
        ALLOW_MOVE_ALONG_DOCK_EDGE,
        HIDE_ON_DOCK_EDGE_HIT,
        appOverridesSignature()
    ].join("|");
}

function loadSettings(reason) {
    var before = settingsSignature();

    VISIBLE_STRIP_PIXELS = asInt(readConfig("visibleStripPixels", 10), 10, 1, 300);
    REVEAL_GAP = asInt(readConfig("revealGap", 8), 8, 0, 300);
    HOVER_MARGIN = asInt(readConfig("hoverMargin", 5), 5, 0, 200);
    LEAVE_MARGIN = asInt(readConfig("leaveMargin", 8), 8, 0, 200);
    MOVE_TOLERANCE = asInt(readConfig("moveTolerance", 40), 40, 1, 200);
    ANIMATE = asBool(readConfig("animate", true), true);
    ANIM_STEPS = asInt(readConfig("animationSteps", 12), 12, 1, 80);
    ANIM_INTERVAL_MS = asInt(readConfig("animationIntervalMs", 14), 14, 1, 100);
    SUPPRESS_FOCUS_REVEAL_IF_LAST_NORMAL_WAS_MINIMIZED = asBool(readConfig("suppressMinimizeFallback", true), true);
    DOCK_TO_VIRTUAL_SCREEN_EDGES = asBool(readConfig("dockToVirtualScreenEdges", true), true);
    DOCK_HINT_MODE = asInt(readConfig("dockHintMode", 2), 2, 0, 3);
    DOCK_HINT_DELAY_MS = asInt(readConfig("dockHintDelayMs", 500), 500, 0, 5000);
    GESTURE_DOCK_ENABLED = asBool(readConfig("gestureDockEnabled", false), false);
    GESTURE_DOCK_MODE = asInt(readConfig("gestureDockMode", 0), 0, 0, 1);
    GESTURE_DOCK_THRESHOLD_PX = asInt(readConfig("gestureDockThresholdPx", 20), 20, 1, 500);
    GESTURE_DOCK_TIMEOUT_MS = asInt(readConfig("gestureDockTimeoutMs", 2500), 2500, 250, 10000);
    GESTURE_DOCK_CONE_DEGREES = asInt(readConfig("gestureDockConeDegrees", 35), 35, 10, 44);
    GESTURE_INDICATOR_ENABLED = asBool(readConfig("gestureIndicatorEnabled", true), true);
    GESTURE_SELECTOR_MODE = asInt(readConfig("gestureSelectorMode", 1), 1, 0, 1);
    GESTURE_SELECTOR_DISTANCE_PX = asInt(readConfig("gestureSelectorDistancePx", 78), 78, 24, 300);
    GESTURE_SELECTOR_TILE_SIZE_PX = asInt(readConfig("gestureSelectorTileSizePx", 54), 54, 18, 180);
    GESTURE_SELECTOR_MARGIN_PX = asInt(readConfig("gestureSelectorMarginPx", 10), 10, 0, 80);

    ATTENTION_POKE_ENABLED = asBool(readConfig("attentionPokeEnabled", true), true);
    ATTENTION_POKE_MODE = asInt(readConfig("attentionPokeMode", 0), 0, 0, 1);
    ATTENTION_POKE_PIXELS = asInt(readConfig("attentionPokePixels", 20), 20, 1, 500);
    ATTENTION_POKE_HOLD_MS = asInt(readConfig("attentionPokeHoldMs", 1200), 1200, 0, 30000);
    ATTENTION_REPEAT_COUNT = asInt(readConfig("attentionRepeatCount", 2), 2, 1, 20);
    ATTENTION_POKE_COOLDOWN_MS = asInt(readConfig("attentionPokeCooldownMs", 2000), 2000, 0, 60000);
    ATTENTION_ANIM_STEPS = asInt(readConfig("attentionAnimationSteps", 6), 6, 1, 80);
    ATTENTION_ANIM_INTERVAL_MS = asInt(readConfig("attentionAnimationIntervalMs", 14), 14, 1, 100);
    RESIZE_ON_DOCK_ENABLED = asBool(readConfig("resizeOnDockEnabled", false), false);
    CENTER_ON_DOCK_ENABLED = asBool(readConfig("centerOnDockEnabled", false), false);
    DEFAULT_RESIZE_WIDTH_VALUE = asInt(readConfig("defaultResizeWidthValue", 0), 0, 0, 9999);
    DEFAULT_RESIZE_HEIGHT_VALUE = asInt(readConfig("defaultResizeHeightValue", 90), 90, 0, 9999);
    ALLOW_MOVE_ALONG_DOCK_EDGE = asBool(readConfig("allowMoveAlongDockEdge", true), true);
    HIDE_ON_DOCK_EDGE_HIT = asBool(readConfig("hideOnDockEdgeHit", false), false);
    APP_OVERRIDES = loadAppOverrides();
    var previewCounter = asInt(readConfig("attentionPreviewCounter", 0), 0, 0, 2147483647);
    if (lastAttentionPreviewCounter < 0) {
        lastAttentionPreviewCounter = previewCounter;
    } else if (previewCounter !== lastAttentionPreviewCounter) {
        lastAttentionPreviewCounter = previewCounter;
        attentionPokeAll("config counter");
    }

    var restoreAllCounter = asInt(readConfig("restoreAllCounter", 0), 0, 0, 2147483647);
    if (lastRestoreAllCounter < 0) {
        lastRestoreAllCounter = restoreAllCounter;
    } else if (restoreAllCounter !== lastRestoreAllCounter) {
        lastRestoreAllCounter = restoreAllCounter;
        undockAllWindows(true, "config restore-all counter");
    }

    var after = settingsSignature();
    if (before !== after || lastSettingsSignature !== after) {
        lastSettingsSignature = after;
        log("Settings loaded (" + reason + "): strip=" + VISIBLE_STRIP_PIXELS +
            " gap=" + REVEAL_GAP +
            " anim=" + ANIM_STEPS + "x" + ANIM_INTERVAL_MS + "ms" +
            " attentionEnabled=" + ATTENTION_POKE_ENABLED +
            " attentionPixels=" + ATTENTION_POKE_PIXELS +
            " attentionHoldMs=" + ATTENTION_POKE_HOLD_MS +
            " attentionRepeatCount=" + ATTENTION_REPEAT_COUNT +
            " attentionAnim=" + ATTENTION_ANIM_STEPS + "x" + ATTENTION_ANIM_INTERVAL_MS + "ms" +
            " resizeOnDock=" + RESIZE_ON_DOCK_ENABLED +
            " centerOnDock=" + CENTER_ON_DOCK_ENABLED +
            " defaultResizeW=" + DEFAULT_RESIZE_WIDTH_VALUE +
            " defaultResizeH=" + DEFAULT_RESIZE_HEIGHT_VALUE +
            " allowAlongEdge=" + ALLOW_MOVE_ALONG_DOCK_EDGE +
            " hideOnDockEdgeHit=" + HIDE_ON_DOCK_EDGE_HIT +
            " dockHintMode=" + DOCK_HINT_MODE +
            " dockHintDelayMs=" + DOCK_HINT_DELAY_MS +
            " gestureEnabled=" + GESTURE_DOCK_ENABLED +
            " gestureMode=" + GESTURE_DOCK_MODE +
            " gestureThreshold=" + GESTURE_DOCK_THRESHOLD_PX +
            " gestureTimeoutMs=" + GESTURE_DOCK_TIMEOUT_MS +
            " gestureCone=" + GESTURE_DOCK_CONE_DEGREES +
            " gestureIndicator=" + GESTURE_INDICATOR_ENABLED +
            " gestureSelectorMode=" + GESTURE_SELECTOR_MODE +
            " gestureSelectorDistance=" + GESTURE_SELECTOR_DISTANCE_PX +
            " gestureSelectorTileSize=" + GESTURE_SELECTOR_TILE_SIZE_PX +
            " gestureSelectorMargin=" + GESTURE_SELECTOR_MARGIN_PX +
            " overrides=" + APP_OVERRIDES.length);
        recomputeAllDockedGeometry(reason);
    }
}


function rectString(r) {
    if (!r) return "(null)";
    return "x=" + Math.round(r.x) + " y=" + Math.round(r.y) +
           " w=" + Math.round(r.width) + " h=" + Math.round(r.height);
}

function winId(win) {
    try { if (win.internalId) return String(win.internalId); } catch (e) {}
    try { return String(win.resourceClass) + ":" + String(win.caption) + ":" + String(win.pid); } catch (e2) {}
    return String(win.caption) + ":" + String(win.pid);
}

function copyRect(r) {
    return {
        x: Math.round(r.x),
        y: Math.round(r.y),
        width: Math.round(r.width),
        height: Math.round(r.height)
    };
}

function sameRect(a, b, tolerance) {
    tolerance = tolerance || 0;
    if (!a || !b) return false;

    return Math.abs(a.x - b.x) <= tolerance &&
           Math.abs(a.y - b.y) <= tolerance &&
           Math.abs(a.width - b.width) <= tolerance &&
           Math.abs(a.height - b.height) <= tolerance;
}

function pointInRect(p, r, margin) {
    margin = margin || 0;
    if (!r) return false;

    return p.x >= r.x - margin &&
           p.x <= r.x + r.width + margin &&
           p.y >= r.y - margin &&
           p.y <= r.y + r.height + margin;
}

function clamp(v, min, max) {
    if (max < min) return min;
    if (v < min) return min;
    if (v > max) return max;
    return v;
}

function setWindowGeometry(win, r, label) {
    try {
        var q = Object.assign({}, win.frameGeometry);
        q.x = Math.round(r.x);
        q.y = Math.round(r.y);
        q.width = Math.round(r.width);
        q.height = Math.round(r.height);
        win.frameGeometry = q;
    } catch (e) {
        log(label + " frameGeometry write failed: " + e);
    }

    var actual = copyRect(win.frameGeometry);
    log(label + " requested " + rectString(r) + " actual " + rectString(actual));
    return actual;
}

function makeTimer(intervalMs, callback) {
    try {
        var t = new QTimer();
        t.interval = intervalMs;
        t.timeout.connect(callback);
        return t;
    } catch (e) {
        log("QTimer unavailable; falling back to instant movement. Error: " + e);
        return null;
    }
}

function stopEntryTimer(entry) {
    if (!entry || !entry.timer) return;

    try { entry.timer.stop(); } catch (e) {}
    entry.timer = null;
    entry.animating = false;
}

function animateMove(entry, to, label, finalState, done, customSteps, customIntervalMs) {
    var win = entry.win;

    stopEntryTimer(entry);

    if (!ANIMATE) {
        entry.animating = true;
        setWindowGeometry(win, to, label);
        entry.animating = false;
        entry.state = finalState;
        if (done) done();
        return;
    }

    var from = copyRect(win.frameGeometry);
    var step = 0;

    var totalSteps = Math.max(1, customSteps !== undefined ? customSteps : ANIM_STEPS);
    var intervalMs = Math.max(1, customIntervalMs !== undefined ? customIntervalMs : ANIM_INTERVAL_MS);

    var timer = makeTimer(intervalMs, function() {
        step++;

        var t = step / totalSteps;
        if (t > 1) t = 1;

        var r = {
            x: Math.round(from.x + (to.x - from.x) * t),
            y: Math.round(from.y + (to.y - from.y) * t),
            width: from.width,
            height: from.height
        };

        entry.animating = true;
        setWindowGeometry(win, r, label + " step " + step + "/" + totalSteps);
        entry.animating = false;

        if (step >= totalSteps) {
            stopEntryTimer(entry);
            setWindowGeometry(win, to, label + " final");
            entry.state = finalState;
            log(label + " finished; state=" + finalState);
            if (done) done();
        }
    });

    if (!timer) {
        entry.animating = true;
        setWindowGeometry(win, to, label + " instant fallback");
        entry.animating = false;
        entry.state = finalState;
        if (done) done();
        return;
    }

    entry.timer = timer;
    entry.animating = true;
    timer.start();
}

function clientAreaFor(win) {
    var area = null;

    try { area = workspace.clientArea(KWin.MaximizeArea, win); } catch (e1) {
        log("clientArea MaximizeArea failed: " + e1);
    }

    if (!area) {
        try { area = workspace.clientArea(KWin.FullArea, win); } catch (e2) {
            log("clientArea FullArea failed: " + e2);
        }
    }

    return copyRect(area);
}

function virtualScreenArea() {
    try {
        if (workspace.virtualScreenGeometry) return copyRect(workspace.virtualScreenGeometry);
    } catch (e) {
        log("virtualScreenGeometry unavailable: " + e);
    }
    return null;
}

function dockAreaFor(win, edge) {
    var local = clientAreaFor(win);

    if (!DOCK_TO_VIRTUAL_SCREEN_EDGES) return local;

    var virtualArea = virtualScreenArea();
    if (!virtualArea) return local;

    /*
     * Use the virtual canvas edge in the docking direction, but preserve the
     * current monitor's perpendicular work area.
     */
    if (edge === "left" || edge === "right") {
        return { x: virtualArea.x, y: local.y, width: virtualArea.width, height: local.height };
    }

    if (edge === "top" || edge === "bottom") {
        return { x: local.x, y: virtualArea.y, width: local.width, height: virtualArea.height };
    }

    return local;
}

function fittedDockBaseGeometry(win, edge, area, original) {
    var base = copyRect(original);
    var adj = dockAdjustmentForWindow(win);

    if (!adj.resize && !adj.center) {
        return base;
    }

    var local = clientAreaFor(win);

    if (adj.resize) {
        /*
         * Global and override resize values use the same rule:
         * 0 = keep current dimension
         * 1-100 = percent of monitor work area
         * 101+ = pixels, clamped to monitor work area
         */
        base.width = dimensionFromOverrideValue(adj.widthValue, local.width, base.width);
        base.height = dimensionFromOverrideValue(adj.heightValue, local.height, base.height);
    }

    if (adj.center) {
        if (edge === "left" || edge === "right") {
            base.y = Math.round(local.y + (local.height - base.height) / 2);
        } else if (edge === "top" || edge === "bottom") {
            base.x = Math.round(local.x + (local.width - base.width) / 2);
        }
    }

    return base;
}


function recomputeEntryGeometry(entry, reason) {
    if (!entry || !entry.win || entry.win.deleted) return;

    var win = entry.win;
    var current = copyRect(win.frameGeometry);
    var area = dockAreaFor(win, entry.edge);
    var base = copyRect(entry.original);

    /*
     * Preserve current size during recompute, then apply current global
     * settings or a matching override. If resize/center are off, the helper
     * returns the base unchanged.
     */
    base.width = current.width;
    base.height = current.height;
    base = fittedDockBaseGeometry(win, entry.edge, area, base);

    entry.area = area;
    entry.revealed = revealedGeometry(area, base, entry.edge);
    entry.hidden = hiddenGeometry(area, entry.revealed, entry.edge);

    if (entry.state === "hidden") {
        setWindowGeometry(win, entry.hidden, "settings recompute hidden");
    } else if (entry.state === "shown") {
        setWindowGeometry(win, entry.revealed, "settings recompute shown");
    }

    log("Recomputed geometry (" + reason + ") for " + win.caption +
        " revealed " + rectString(entry.revealed) +
        " hidden " + rectString(entry.hidden) +
        " strip " + rectString(stripGeometry(entry)));
}

function recomputeAllDockedGeometry(reason) {
    for (var i = 0; i < stowed.length; i++) {
        recomputeEntryGeometry(stowed[i], reason);
    }
}



function isUsableWindow(win) {
    if (!win) return false;
    if (!win.managed) return false;
    if (win.deleted) return false;
    if (win.specialWindow) return false;
    if (win.popupWindow) return false;
    if (win.desktopWindow || win.dock || win.splash || win.tooltip || win.notification) return false;
    if (!win.moveable && !win.moveableAcrossScreens) return false;
    if (win.fullScreen) return false;
    return true;
}

/*
 * Focus targets are allowed to be KWin-fullscreen. Docking still uses
 * isUsableWindow(), because docking a fullscreen client itself is not a
 * sane/default operation. This separate predicate lets us restore focus to
 * games whose borderless mode toggles KWin's fullScreen state.
 */
function isFocusableWindow(win) {
    if (!win) return false;
    if (!win.managed) return false;
    if (win.deleted) return false;
    if (win.specialWindow) return false;
    if (win.popupWindow) return false;
    if (win.desktopWindow || win.dock || win.splash || win.tooltip || win.notification) return false;
    return true;
}

function findEntry(win) {
    if (!win) return null;
    var id = winId(win);

    for (var i = 0; i < stowed.length; i++) {
        if (stowed[i].id === id) return stowed[i];
    }

    return null;
}

function isDockedWindow(win) {
    return findEntry(win) !== null;
}

function removeEntryForWindow(win) {
    var id = winId(win);

    for (var i = stowed.length - 1; i >= 0; i--) {
        if (stowed[i].id === id) {
            stopEntryTimer(stowed[i]);
            stowed.splice(i, 1);
        }
    }
}

function removeEntry(entry) {
    for (var i = stowed.length - 1; i >= 0; i--) {
        if (stowed[i] === entry) {
            stopEntryTimer(entry);
            stowed.splice(i, 1);
        }
    }
}

function revealedGeometry(area, original, edge) {
    var r = copyRect(original);

    if (edge === "left") {
        r.x = area.x + REVEAL_GAP;
        r.y = clamp(original.y, area.y, area.y + area.height - r.height);
    } else if (edge === "right") {
        r.x = area.x + area.width - r.width - REVEAL_GAP;
        r.y = clamp(original.y, area.y, area.y + area.height - r.height);
    } else if (edge === "top") {
        r.y = area.y + REVEAL_GAP;
        r.x = clamp(original.x, area.x, area.x + area.width - r.width);
    } else if (edge === "bottom") {
        r.y = area.y + area.height - r.height - REVEAL_GAP;
        r.x = clamp(original.x, area.x, area.x + area.width - r.width);
    }

    return r;
}

function hiddenGeometry(area, revealed, edge) {
    var r = copyRect(revealed);

    if (edge === "left") {
        r.x = area.x - r.width + VISIBLE_STRIP_PIXELS;
    } else if (edge === "right") {
        r.x = area.x + area.width - VISIBLE_STRIP_PIXELS;
    } else if (edge === "top") {
        r.y = area.y - r.height + VISIBLE_STRIP_PIXELS;
    } else if (edge === "bottom") {
        r.y = area.y + area.height - VISIBLE_STRIP_PIXELS;
    }

    return r;
}

function stripGeometry(entry) {
    var r = copyRect(entry.hidden);

    if (entry.edge === "left") {
        r.x = entry.area.x;
        r.width = VISIBLE_STRIP_PIXELS;
    } else if (entry.edge === "right") {
        r.x = entry.area.x + entry.area.width - VISIBLE_STRIP_PIXELS;
        r.width = VISIBLE_STRIP_PIXELS;
    } else if (entry.edge === "top") {
        r.y = entry.area.y;
        r.height = VISIBLE_STRIP_PIXELS;
    } else if (entry.edge === "bottom") {
        r.y = entry.area.y + entry.area.height - VISIBLE_STRIP_PIXELS;
        r.height = VISIBLE_STRIP_PIXELS;
    }

    return r;
}

function bridgeGeometry(entry, current) {
    var area = entry.area;
    var r = null;

    if (entry.edge === "left") {
        r = { x: area.x, y: current.y, width: Math.max(0, current.x - area.x), height: current.height };
    } else if (entry.edge === "right") {
        r = { x: current.x + current.width, y: current.y, width: Math.max(0, area.x + area.width - (current.x + current.width)), height: current.height };
    } else if (entry.edge === "top") {
        r = { x: current.x, y: area.y, width: current.width, height: Math.max(0, current.y - area.y) };
    } else if (entry.edge === "bottom") {
        r = { x: current.x, y: current.y + current.height, width: current.width, height: Math.max(0, area.y + area.height - (current.y + current.height)) };
    }

    return r;
}

function cursorInShownHoverRegion(entry, p) {
    var current = copyRect(entry.win.frameGeometry);
    return pointInRect(p, current, LEAVE_MARGIN) ||
           pointInRect(p, bridgeGeometry(entry, current), LEAVE_MARGIN);
}


function cursorAgainstDockedEdge(entry, p) {
    if (!HIDE_ON_DOCK_EDGE_HIT) return false;

    var m = Math.max(0, DOCK_EDGE_HIT_MARGIN);

    if (entry.edge === "left") {
        return p.x <= entry.area.x + m;
    }
    if (entry.edge === "right") {
        return p.x >= entry.area.x + entry.area.width - 1 - m;
    }
    if (entry.edge === "top") {
        return p.y <= entry.area.y + m;
    }
    if (entry.edge === "bottom") {
        return p.y >= entry.area.y + entry.area.height - 1 - m;
    }

    return false;
}

function windowUnderCursor(excludeWin) {
    try {
        var p = workspace.cursorPos;
        var w = workspace.windowAt(p);

        if (w && w !== excludeWin && isFocusableWindow(w) && !w.minimized && !isDockedWindow(w)) {
            return w;
        }
    } catch (e) {
        log("windowUnderCursor failed: " + e);
    }

    return null;
}

function topmostNonDockedWindow(excludeWin) {
    try {
        var list = workspace.stackingOrder;

        for (var i = list.length - 1; i >= 0; i--) {
            var w = list[i];

            if (w && w !== excludeWin && isFocusableWindow(w) && !w.minimized && !isDockedWindow(w)) {
                return w;
            }
        }
    } catch (e) {
        log("topmostNonDockedWindow failed: " + e);
    }

    return null;
}

function topmostFullscreenNonDockedWindow(excludeWin) {
    try {
        var list = workspace.stackingOrder;

        for (var i = list.length - 1; i >= 0; i--) {
            var w = list[i];

            if (w && w !== excludeWin && isFocusableWindow(w) && !w.minimized && !isDockedWindow(w) && isFullscreenWindow(w)) {
                return w;
            }
        }
    } catch (e) {
        log("topmostFullscreenNonDockedWindow failed: " + e);
    }

    return null;
}


function chooseFocusTarget(entry) {
    /*
     * Prefer the window that had focus before reveal. This is important with
     * KWin fullscreen game windows: windowAt(cursor) can point at a different
     * normal window once the docked window hides, which caused random apps to
     * receive focus and leave panels/taskbars visible.
     */
    if (entry.previousFocus && isFocusableWindow(entry.previousFocus) && !entry.previousFocus.minimized && entry.previousFocus !== entry.win && !isDockedWindow(entry.previousFocus)) {
        log("Focus target previousFocus: " + entry.previousFocus.caption);
        return entry.previousFocus;
    }

    if (lastFullscreenFocus && isFocusableWindow(lastFullscreenFocus) && !lastFullscreenFocus.minimized && lastFullscreenFocus !== entry.win && !isDockedWindow(lastFullscreenFocus)) {
        log("Focus target lastFullscreenFocus: " + lastFullscreenFocus.caption);
        return lastFullscreenFocus;
    }

    if (lastNonDockedFocus && isFocusableWindow(lastNonDockedFocus) && !lastNonDockedFocus.minimized && lastNonDockedFocus !== entry.win && !isDockedWindow(lastNonDockedFocus)) {
        log("Focus target lastNonDockedFocus: " + lastNonDockedFocus.caption);
        return lastNonDockedFocus;
    }

    var target = topmostFullscreenNonDockedWindow(entry.win);
    if (target) {
        log("Focus target topmost fullscreen non-docked: " + target.caption);
        return target;
    }

    target = windowUnderCursor(entry.win);
    if (target) {
        log("Focus target under cursor: " + target.caption);
        return target;
    }

    target = topmostNonDockedWindow(entry.win);
    if (target) {
        log("Focus target topmost non-docked: " + target.caption);
        return target;
    }

    log("No focus target found.");
    return null;
}



function reloadSettingsViaKWinReconfigure(reason) {
    /*
     * KWin's readConfig() can return cached values until KWin reconfigure is
     * triggered. CLI changes worked because touchslide-config called:
     *   qdbus6 org.kde.KWin /KWin reconfigure
     *
     * This makes the in-script Reload Settings action do the same thing before
     * calling loadSettings().
     */
    log("Reload Settings requested via KWin reconfigure (" + reason + ")");

    try {
        callDBus("org.kde.KWin", "/KWin", "org.kde.KWin", "reconfigure", function() {
            log("KWin reconfigure callback received for reload (" + reason + ")");
            delayedLoadSettings("dbus reconfigure callback " + reason);
        });
    } catch (e1) {
        log("KWin reconfigure call with interface failed: " + e1);
        try {
            callDBus("org.kde.KWin", "/KWin", "", "reconfigure", function() {
                log("KWin reconfigure callback received for reload using empty interface (" + reason + ")");
                delayedLoadSettings("dbus reconfigure empty-interface callback " + reason);
            });
        } catch (e2) {
            log("KWin reconfigure call with empty interface failed: " + e2);
        }
    }

    delayedLoadSettings("reload fallback timer " + reason);
}

function delayedLoadSettings(reason) {
    var t = makeTimer(500, function() {
        try { t.stop(); } catch (e) {}
        loadSettings(reason);
    });

    if (t) {
        t.start();
    } else {
        loadSettings(reason);
    }
}

function focusWindow(win, reason) {
    if (!win || !isFocusableWindow(win)) return false;

    try {
        suppressActivationHandling = true;
        try { workspace.raiseWindow(win); } catch (e1) {}
        workspace.activeWindow = win;
        suppressActivationHandling = false;

        if (!isDockedWindow(win)) {
            rememberNonDockedFocus(win, "focusWindow " + reason);
        }

        log("Focused " + win.caption + " (" + reason + ")");
        return true;
    } catch (e) {
        suppressActivationHandling = false;
        log("Failed to focus " + reason + ": " + e);
        return false;
    }
}

function nowMs() {
    try { return (new Date()).getTime(); } catch (e) { return 0; }
}

function suppressFocusRevealFor(ms, reason) {
    suppressFocusRevealUntil = nowMs() + ms;
    suppressFocusRevealReason = reason;
    log("Suppressing focus-triggered dock reveal for " + ms + "ms: " + reason);
}

function markWindowClosed(win, reason) {
    if (!win) return;
    if (findEntry(win)) return;
    suppressFocusRevealFor(3000, reason);
}

function connectCloseSuppressor(win) {
    if (!win || !isUsableWindow(win)) return;
    if (isDockedWindow(win)) return;

    var id = winId(win);
    if (closedSignalConnected[id]) return;
    closedSignalConnected[id] = true;

    try {
        win.closed.connect(function() {
            log("Non-docked window closed: " + win.caption);
            markWindowClosed(win, "non-docked window closed signal");
        });
    } catch (e) {
        log("Could not connect close suppressor for " + win.caption + ": " + e);
    }
}

function shouldSuppressFocusReveal(entry) {
    if (nowMs() < suppressFocusRevealUntil) {
        log("Suppressing focus reveal for " + entry.win.caption + " because " + suppressFocusRevealReason);
        return true;
    }

    if (lastNonDockedFocus) {
        try {
            if (lastNonDockedFocus.deleted ||
                lastNonDockedFocus.minimized ||
                !lastNonDockedFocus.managed) {
                log("Suppressing focus reveal because previous normal window is minimized/deleted/unmanaged: " + entry.win.caption);
                suppressFocusRevealFor(3000, "previous normal window unavailable");
                return true;
            }
        } catch (e) {
            log("Suppressing focus reveal because previous normal window is invalid: " + entry.win.caption);
            suppressFocusRevealFor(3000, "previous normal window invalid");
            return true;
        }
    }

    return false;
}

function rememberPreviousFocus(entry, preferred) {
    try {
        if (preferred && preferred !== entry.win && isFocusableWindow(preferred) && !isDockedWindow(preferred)) {
            entry.previousFocus = preferred;
            log("Remembered previous focus from preferred: " + preferred.caption);
            return;
        }

        var active = workspace.activeWindow;
        if (active && active !== entry.win && isFocusableWindow(active) && !isDockedWindow(active)) {
            entry.previousFocus = active;
            log("Remembered previous focus from active: " + active.caption);
            return;
        }

        if (lastNonDockedFocus && lastNonDockedFocus !== entry.win && isFocusableWindow(lastNonDockedFocus) && !isDockedWindow(lastNonDockedFocus)) {
            entry.previousFocus = lastNonDockedFocus;
            log("Remembered previous focus from last non-docked: " + lastNonDockedFocus.caption);
            return;
        }

        entry.previousFocus = null;
    } catch (e) {
        entry.previousFocus = null;
    }
}

function restoreWindowState(entry, focusIt) {
    var win = entry.win;
    if (!win || win.deleted) return;

    try {
        win.keepAbove = entry.oldKeepAbove;
        win.skipSwitcher = entry.oldSkipSwitcher;

        if (focusIt) {
            suppressActivationHandling = true;
            workspace.raiseWindow(win);
            workspace.activeWindow = win;
            suppressActivationHandling = false;
        }
    } catch (e) {
        suppressActivationHandling = false;
        log("Failed to restore state: " + e);
    }
}

function undockWindow(entry, restorePosition) {
    var win = entry.win;

    stopEntryTimer(entry);

    if (win && !win.deleted) {
        try {
            if (restorePosition) setWindowGeometry(win, entry.original, "undock restore-position");
            restoreWindowState(entry, true);
            log("Undocked: " + win.caption + " restorePosition=" + restorePosition);
        } catch (e) {
            log("Failed to undock: " + e);
        }
    }

    removeEntry(entry);
}

function undockAllWindows(restorePosition, reason) {
    clearGestureIndicator("restore/undock all");
    cancelPendingFocusReveal("restore/undock all");
    log("Restore/undock all requested (" + reason + "), count=" + stowed.length);

    for (var i = stowed.length - 1; i >= 0; i--) {
        try {
            undockWindow(stowed[i], restorePosition);
        } catch (e) {
            log("Failed to undock entry during restore-all: " + e);
        }
    }
}



function scheduleDockAttentionHint(entry, delayMs) {
    var timer = makeTimer(Math.max(0, delayMs), function() {
        try { timer.stop(); } catch (e0) {}
        if (!entry || !entry.win || entry.win.deleted || !isUsableWindow(entry.win)) return;
        if (entry.state !== "hidden") return;
        attentionPoke(entry, true);
    });

    if (timer) {
        timer.start();
    }
}

function finishDockSetup(entry, win) {
    try { win.closed.connect(function() { removeEntryForWindow(win); }); } catch (e2) {}
    connectAttentionSignal(win);
    try { win.frameGeometryChanged.connect(function() { onWindowGeometryChanged(win); }); } catch (e3) {}

    log("Docked OK: " + win.caption + " to " + entry.edge);
}

function applyDockHint(entry) {
    var win = entry.win;

    if (DOCK_HINT_MODE === 1) {
        entry.state = "docking";
        animateMove(entry, entry.hidden, "dock animate-to-hidden", "hidden", function() {
            entry.hoverArmed = false;
            entry.cursorLeaveArmed = false;
            entry.edgeHideArmed = false;
            finishDockSetup(entry, win);
        });
        return;
    }

    if (DOCK_HINT_MODE === 2) {
        /*
         * Start fully visible at the dock edge, wait briefly, then use the
         * normal hide animation. This gives users a clear visual clue about
         * where the window went without requiring a separate overlay.
         */
        setWindowGeometry(win, entry.revealed, "dock hint revealed");
        entry.state = "shown";
        entry.hoverArmed = false;
        entry.cursorLeaveArmed = false;
        entry.edgeHideArmed = false;

        var timer = makeTimer(Math.max(0, DOCK_HINT_DELAY_MS), function() {
            try { timer.stop(); } catch (e0) {}
            if (!entry || !entry.win || entry.win.deleted || !isUsableWindow(entry.win)) return;
            if (entry.state !== "shown") return;
            entry.state = "hiding";
            animateMove(entry, entry.hidden, "dock hint stow", "hidden", function() {
                entry.hoverArmed = false;
                entry.cursorLeaveArmed = false;
                entry.edgeHideArmed = false;
                finishDockSetup(entry, win);
            });
        });

        if (timer) {
            timer.start();
        } else {
            setWindowGeometry(win, entry.hidden, "dock hint fallback hidden");
            entry.state = "hidden";
            finishDockSetup(entry, win);
        }
        return;
    }

    setWindowGeometry(win, entry.hidden, "dock hide");
    entry.state = "hidden";

    if (DOCK_HINT_MODE === 3) {
        scheduleDockAttentionHint(entry, DOCK_HINT_DELAY_MS);
    }

    finishDockSetup(entry, win);
}


function dockWindow(win, edge) {
    loadSettings("dockWindow");
    if (!isUsableWindow(win)) {
        log("Refusing to dock unusable/special window.");
        return;
    }

    var existing = findEntry(win);
    if (existing) {
        undockWindow(existing, true);
        return;
    }

    var area = dockAreaFor(win, edge);
    var original = copyRect(win.frameGeometry);
    var dockBase = fittedDockBaseGeometry(win, edge, area, original);
    var revealed = revealedGeometry(area, dockBase, edge);
    var hidden = hiddenGeometry(area, revealed, edge);

    var entry = {
        id: winId(win),
        win: win,
        edge: edge,
        area: area,
        original: original,
        revealed: revealed,
        hidden: hidden,
        state: "hidden",
        animating: false,
        timer: null,
        hoverArmed: true,
        cursorLeaveArmed: false,
        edgeHideArmed: false,
        previousFocus: null,
        oldKeepAbove: win.keepAbove,
        oldSkipSwitcher: win.skipSwitcher
    };

    stowed.push(entry);

    try {
        win.keepAbove = true;
        win.skipSwitcher = false;

        log("Docking: " + win.caption +
            " edge=" + edge +
            " area " + rectString(area) +
            " original " + rectString(original) +
            " revealed " + rectString(revealed) +
            " hidden " + rectString(hidden) +
            " strip " + rectString(stripGeometry(entry)));

        applyDockHint(entry);
    } catch (e) {
        log("Failed to dock window: " + e);
        removeEntry(entry);
    }
}

function interruptAttentionForReveal(entry, reason) {
    if (!entry || entry.state !== "attention") return;

    stopEntryTimer(entry);
    entry.state = "hidden";
    entry.hoverArmed = false;
    log("Attention animation interrupted for reveal: " + entry.win.caption + " (" + reason + ")");
}

function revealWindow(entry, preferredPreviousFocus, reason) {
    loadSettings("revealWindow");
    interruptAttentionForReveal(entry, reason);
    var win = entry.win;
    if (!isUsableWindow(win)) return;
    if (entry.state === "shown" || entry.state === "revealing") return;

    try {
        entry.state = "revealing";
        entry.hoverArmed = false;

        /*
         * If reveal was caused by hover, cursor-leave should hide it.
         * If reveal was caused by focus/Alt-Tab, do not hide just because the
         * mouse moves somewhere else. Only arm cursor-leave after the cursor
         * actually enters the revealed window/bridge.
         */
        entry.cursorLeaveArmed = (reason === "hover");

        /*
         * Edge-hit hide must not trigger immediately from the same edge strip
         * that revealed the window. It only becomes active after the cursor
         * first leaves that initial trigger strip.
         */
        entry.edgeHideArmed = false;

        rememberPreviousFocus(entry, preferredPreviousFocus);

        win.keepAbove = true;
        suppressActivationHandling = true;
        workspace.raiseWindow(win);
        workspace.activeWindow = win;
        suppressActivationHandling = false;

        log("Reveal started (" + reason + "): " + win.caption);
        animateMove(entry, entry.revealed, "reveal edge-hugging", "shown", function() {
            log("Revealed: " + win.caption);
        });
    } catch (e) {
        suppressActivationHandling = false;
        entry.state = "hidden";
        log("Failed to reveal window: " + e);
    }
}

function hideWindow(entry, restoreFocus, reason) {
    loadSettings("hideWindow");
    var win = entry.win;
    if (!isUsableWindow(win)) return;
    if (entry.state === "hidden" || entry.state === "hiding") return;

    try {
        var target = null;

        if (restoreFocus) {
            target = chooseFocusTarget(entry);
            if (target) {
                focusWindow(target, "cursor-left restore-before-hide");
            }
        }

        entry.state = "hiding";
        win.keepAbove = true;

        log("Hide started (" + reason + "): " + win.caption);
        animateMove(entry, entry.hidden, "hide again", "hidden", function() {
            entry.hoverArmed = false;
            entry.cursorLeaveArmed = false;
            entry.edgeHideArmed = false;

            /*
             * Some fullscreen/borderless game scenarios change focus again
             * during/after the move animation. Restore once more after the
             * docked window is hidden.
             */
            if (restoreFocus && target && isFocusableWindow(target) && !target.minimized && !target.deleted) {
                focusWindow(target, "cursor-left restore-after-hide");
            }

            log("Hidden again: " + win.caption);
        });
    } catch (e) {
        entry.state = "shown";
        log("Failed to hide window: " + e);
    }
}


function pokeOffsetGeometry(entry, pixels) {
    var r = copyRect(entry.hidden);

    if (entry.edge === "left") {
        r.x = entry.hidden.x + pixels;
    } else if (entry.edge === "right") {
        r.x = entry.hidden.x - pixels;
    } else if (entry.edge === "top") {
        r.y = entry.hidden.y + pixels;
    } else if (entry.edge === "bottom") {
        r.y = entry.hidden.y - pixels;
    }

    return r;
}

function attentionPokeAll(reason) {
    log("Attention poke preview all (" + reason + ")");

    try {
        callDBus("org.kde.KWin", "/KWin", "org.kde.KWin", "reconfigure", function() {});
    } catch (e1) {
        try { callDBus("org.kde.KWin", "/KWin", "", "reconfigure", function() {}); } catch (e2) {}
    }

    var t = makeTimer(250, function() {
        try { t.stop(); } catch (e3) {}
        loadSettings("attention preview reload " + reason);

        for (var i = 0; i < stowed.length; i++) {
            attentionPoke(stowed[i], true);
        }
    });

    if (t) {
        t.start();
    } else {
        loadSettings("attention preview fallback " + reason);
        for (var j = 0; j < stowed.length; j++) {
            attentionPoke(stowed[j], true);
        }
    }
}

function shellQuote(s) {
    return "'" + String(s).replace(/'/g, "'\"'\"'") + "'";
}

function openSettingsGui() {
    /*
     * Use KDE KLauncher over DBus. KWin cannot spawn shell commands directly,
     * but KLauncher can start the same KCM used by the KWin Scripts manager.
     *
     * The generic scripted KCM expects two arguments: plugin id and package
     * type. If Plasma rejects that direct config dialog, fall back to the KWin
     * Scripts manager page, then to the standalone helper as a last resort.
     *
     * qdbus examples for KLauncher use an empty interface with exec_blind:
     *   qdbus org.kde.klauncher6 /KLauncher exec_blind /path/to/app ""
     */
    var helper = readConfig("settingsCommand", "/home/jk/.local/bin/touchslide-settings");
    var scriptsPageCmd = "systemsettings kcm_kwin_scripts";
    var nativeCmd =
        "kcmshell6 kcm_kwin4_genericscripted --args " +
        shellQuote("touch-slide-window KWin/Script") +
        " --caption " + shellQuote("Touch Slide Window Settings") +
        " || systemsettings kcm_kwin_scripts" +
        " || " + shellQuote(helper);
    var wrapper = "/bin/sh";
    var wrapperArgs = ["-lc", nativeCmd];
    var wrapperArg = "-lc " + shellQuote(nativeCmd);

    log("Trying to open KDE KWin Scripts settings page.");

    try {
        callDBus("org.kde.klauncher6", "/KLauncher", "org.kde.KLauncher", "exec_blind", "systemsettings", ["kcm_kwin_scripts"], function() {
            log("Requested KWin Scripts page through org.kde.klauncher6 argument list.");
        });
        return;
    } catch (p1) {
        log("klauncher6 KWin Scripts page launch failed: " + p1);
    }

    try {
        callDBus("org.kde.klauncher6", "/KLauncher", "", "exec_blind", "systemsettings", ["kcm_kwin_scripts"], function() {
            log("Requested KWin Scripts page through org.kde.klauncher6 empty-interface argument list.");
        });
        return;
    } catch (p2) {
        log("klauncher6 empty-interface KWin Scripts page launch failed: " + p2);
    }

    try {
        callDBus("org.kde.klauncher6", "/KLauncher", "", "exec_blind", wrapper, "-lc " + shellQuote(scriptsPageCmd), function() {
            log("Requested KWin Scripts page through shell fallback.");
        });
        return;
    } catch (p3) {
        log("klauncher6 shell KWin Scripts page launch failed: " + p3);
    }

    log("Trying to open native settings GUI: " + nativeCmd);

    try {
        callDBus("org.kde.klauncher6", "/KLauncher", "org.kde.KLauncher", "exec_blind", wrapper, wrapperArgs, function() {
            log("Requested native settings GUI through org.kde.klauncher6 argument list.");
        });
        return;
    } catch (e1) {
        log("klauncher6 argument-list settings launch failed: " + e1);
    }

    try {
        callDBus("org.kde.klauncher6", "/KLauncher", "", "exec_blind", wrapper, wrapperArgs, function() {
            log("Requested native settings GUI through org.kde.klauncher6 empty-interface argument list.");
        });
        return;
    } catch (e2) {
        log("klauncher6 empty-interface argument-list settings launch failed: " + e2);
    }

    try {
        callDBus("org.kde.klauncher6", "/KLauncher", "", "exec_blind", wrapper, wrapperArg, function() {
            log("Requested native settings GUI through org.kde.klauncher6 string fallback.");
        });
        return;
    } catch (e3) {
        log("klauncher6 string fallback settings launch failed: " + e3);
    }

    try {
        callDBus("org.kde.klauncher5", "/KLauncher", "", "exec_blind", wrapper, wrapperArg, function() {
            log("Requested native settings GUI through org.kde.klauncher5.");
        });
        return;
    } catch (e4) {
        log("klauncher5 settings launch failed: " + e4);
    }

    log("Could not open settings GUI from KWin script. Run manually: " + nativeCmd);
}

function runAttentionRepeat(entry, originalHidden, poke, index, total) {
    if (!entry || entry.state !== "attention") return;

    animateMove(entry, poke, "attention repeat " + index + " in", "attention", function() {
        if (!entry || entry.state !== "attention") return;

        var timer = makeTimer(ATTENTION_POKE_HOLD_MS, function() {
            try { timer.stop(); } catch (e) {}
            if (!entry || entry.state !== "attention") return;

            var finalState = (index >= total) ? "hidden" : "attention";

            animateMove(entry, originalHidden, "attention repeat " + index + " out", finalState, function() {
                if (!entry) return;

                if (index >= total) {
                    entry.state = "hidden";
                    return;
                }

                runAttentionRepeat(entry, originalHidden, poke, index + 1, total);
            }, ATTENTION_ANIM_STEPS, ATTENTION_ANIM_INTERVAL_MS);
        });

        if (timer) {
            entry.timer = timer;
            timer.start();
        } else {
            animateMove(entry, originalHidden, "attention repeat " + index + " out fallback", (index >= total ? "hidden" : "attention"), function() {
                if (index >= total) {
                    entry.state = "hidden";
                } else {
                    runAttentionRepeat(entry, originalHidden, poke, index + 1, total);
                }
            }, ATTENTION_ANIM_STEPS, ATTENTION_ANIM_INTERVAL_MS);
        }
    }, ATTENTION_ANIM_STEPS, ATTENTION_ANIM_INTERVAL_MS);
}

function attentionPoke(entry, forcePreview) {
    if (!ATTENTION_POKE_ENABLED) return;
    if (!entry || !entry.win || entry.win.deleted) return;
    if (entry.state !== "hidden") return;
    if (workspace.activeWindow === entry.win) return;

    var now = nowMs();
    if (!forcePreview && entry.lastAttentionPokeAt && now - entry.lastAttentionPokeAt < ATTENTION_POKE_COOLDOWN_MS) {
        return;
    }

    entry.lastAttentionPokeAt = now;

    var total = Math.max(1, ATTENTION_REPEAT_COUNT);
    var originalHidden = copyRect(entry.hidden);
    var poke = pokeOffsetGeometry(entry, ATTENTION_POKE_PIXELS);

    log("Attention poke: " + entry.win.caption +
        " repeats=" + total +
        " holdMs=" + ATTENTION_POKE_HOLD_MS +
        " distance=" + ATTENTION_POKE_PIXELS);

    entry.state = "attention";
    runAttentionRepeat(entry, originalHidden, poke, 1, total);
}

function connectAttentionSignal(win) {
    if (!win || !isUsableWindow(win)) return;

    var id = winId(win);
    if (attentionSignalConnected[id]) return;
    attentionSignalConnected[id] = true;

    try {
        win.demandsAttentionChanged.connect(function() {
            var entry = findEntry(win);
            if (!entry) return;

            loadSettings("demandsAttentionChanged");

            try {
                if (win.demandsAttention) {
                    attentionPoke(entry);
                }
            } catch (e) {
                log("demandsAttention read failed: " + e);
            }
        });
    } catch (e2) {
        log("Could not connect demandsAttentionChanged for " + win.caption + ": " + e2);
    }
}


function movedAwayFromDockedEdge(entry, current) {
    var expected = entry.revealed;
    var tol = MOVE_TOLERANCE;

    if (!ALLOW_MOVE_ALONG_DOCK_EDGE) {
        return !sameRect(current, expected, tol);
    }

    if (entry.edge === "left") return current.x > expected.x + tol;
    if (entry.edge === "right") return current.x < expected.x - tol;
    if (entry.edge === "top") return current.y > expected.y + tol;
    if (entry.edge === "bottom") return current.y < expected.y - tol;

    return !sameRect(current, expected, tol);
}

function updateAlongEdgeGeometry(entry, current) {
    entry.revealed = copyRect(current);
    entry.hidden = hiddenGeometry(entry.area, entry.revealed, entry.edge);
}

function manualDragAwayUndock(entry, current, reason) {
    var win = entry.win;
    if (!win || win.deleted) {
        removeEntry(entry);
        return;
    }

    /*
     * User is already dragging the window away from the docked edge.
     * Restore original size, but preserve the current dragged position to
     * avoid snapping the window back to its pre-dock coordinates.
     */
    var restoredSize = {
        x: current.x,
        y: current.y,
        width: entry.original.width,
        height: entry.original.height
    };

    try {
        setWindowGeometry(win, restoredSize, "manual drag-away restore-size");
        restoreWindowState(entry, true);
    } catch (e) {
        log("Manual drag-away restore-size failed: " + e);
    }

    log("Manual drag-away undock (" + reason + "): " + win.caption +
        " geometry " + rectString(restoredSize));

    removeEntry(entry);
}

function onWindowGeometryChanged(win) {
    var entry = findEntry(win);
    if (!entry) return;
    if (entry.animating) return;
    if (entry.state !== "shown") return;

    var current = copyRect(win.frameGeometry);

    if (movedAwayFromDockedEdge(entry, current)) {
        log("Manual move away from docked edge detected while shown. Undocking " + win.caption +
            " current " + rectString(current) +
            " expected edge-hug " + rectString(entry.revealed));

        manualDragAwayUndock(entry, current, "geometry-changed");
    } else if (!sameRect(current, entry.revealed, MOVE_TOLERANCE)) {
        updateAlongEdgeGeometry(entry, current);
        log("Updated along-edge docked position: " + win.caption +
            " revealed " + rectString(entry.revealed) +
            " hidden " + rectString(entry.hidden));
    }
}

function checkCursor() {
    var p = workspace.cursorPos;

    for (var i = 0; i < stowed.length; i++) {
        var entry = stowed[i];
        var win = entry.win;

        if (!win || win.deleted) continue;

        var strip = stripGeometry(entry);
        var overStrip = pointInRect(p, strip, HOVER_MARGIN);

        if (entry.state === "attention") {
            if (overStrip || pointInRect(p, win.frameGeometry, HOVER_MARGIN)) {
                revealWindow(entry, null, "hover during attention");
            }
            continue;
        }

        if (entry.state === "hidden") {
            if (!overStrip) {
                entry.hoverArmed = true;
            } else if (entry.hoverArmed) {
                revealWindow(entry, null, "hover");
            }
            continue;
        }

        if (entry.state === "revealing") {
            continue;
        }

        if (entry.state === "shown") {
            var current = copyRect(win.frameGeometry);

            if (movedAwayFromDockedEdge(entry, current)) {
                manualDragAwayUndock(entry, current, "cursor-check");
                log("Undocked due to move away from docked edge: " + win.caption);
                continue;
            } else if (!sameRect(current, entry.revealed, MOVE_TOLERANCE)) {
                updateAlongEdgeGeometry(entry, current);
            }

            var inShownHoverRegion = cursorInShownHoverRegion(entry, p);

            if (HIDE_ON_DOCK_EDGE_HIT) {
                if (!entry.edgeHideArmed) {
                    if (!overStrip) {
                        entry.edgeHideArmed = true;
                    }
                } else if (inShownHoverRegion && cursorAgainstDockedEdge(entry, p)) {
                    entry.cursorLeaveArmed = true;
                    hideWindow(entry, true, "cursor-hit-docked-edge-after-arm");
                    continue;
                }
            }

            if (inShownHoverRegion) {
                entry.cursorLeaveArmed = true;

                if (workspace.activeWindow !== win) {
                    suppressActivationHandling = true;
                    workspace.activeWindow = win;
                    suppressActivationHandling = false;
                    log("Focused hovered docked window: " + win.caption);
                }
            } else {
                if (entry.cursorLeaveArmed) {
                    hideWindow(entry, true, "cursor-left");
                } else {
                    /*
                     * Focus/Alt-Tab reveal: cursor has not entered this docked
                     * window yet, so ignore mouse movement outside it.
                     */
                }
            }
            continue;
        }

        if (entry.state === "hiding") {
            continue;
        }
    }
}


function cancelPendingFocusReveal(reason) {
    if (focusRevealTimer) {
        try { focusRevealTimer.stop(); } catch (e) {}
    }

    focusRevealTimer = null;
    pendingFocusRevealEntry = null;
    pendingFocusRevealPrevious = null;

    if (reason) {
        log("Cancelled pending focus reveal: " + reason);
    }
}

function scheduleFocusReveal(entry, preferredPreviousFocus, reason) {
    cancelPendingFocusReveal("new focus reveal scheduled");

    if (!entry || !entry.win || entry.win.deleted) return;

    pendingFocusRevealEntry = entry;
    pendingFocusRevealPrevious = preferredPreviousFocus;

    log("Scheduled focus reveal in " + FOCUS_REVEAL_DELAY_MS + "ms: " + entry.win.caption + " (" + reason + ")");

    focusRevealTimer = makeTimer(FOCUS_REVEAL_DELAY_MS, function() {
        var e = pendingFocusRevealEntry;
        var prev = pendingFocusRevealPrevious;

        cancelPendingFocusReveal("focus reveal timer fired");

        if (!e || !e.win || e.win.deleted || !isUsableWindow(e.win)) {
            log("Delayed focus reveal ignored: docked window unavailable.");
            return;
        }

        if (workspace.activeWindow !== e.win) {
            log("Delayed focus reveal ignored: docked window no longer active.");
            return;
        }

        if (nowMs() < suppressFocusRevealUntil) {
            log("Delayed focus reveal suppressed because " + suppressFocusRevealReason);

            var fallback = chooseFocusTarget(e);
            if (fallback && fallback !== e.win) {
                focusWindow(fallback, "delayed focus-reveal suppression fallback");
            }
            return;
        }

        revealWindow(e, prev, "focus-delayed");
    });

    if (focusRevealTimer) {
        focusRevealTimer.start();
    } else {
        log("Could not create focus reveal timer; falling back to immediate reveal.");
        revealWindow(entry, preferredPreviousFocus, "focus-immediate-fallback");
    }
}

function onWindowActivated(win) {
    if (suppressActivationHandling) return;
    if (!win || !isFocusableWindow(win)) return;

    var activatedEntry = findEntry(win);

    if (activatedEntry) {
        /*
         * Covers Alt-Tab or task-manager activation of a hidden docked window.
         *
         * Suppress reveal if focus likely arrived here only because another
         * window was minimized or closed.
         */
        if (shouldSuppressFocusReveal(activatedEntry)) {
            var target = topmostNonDockedWindow(win);
            if (target) {
                focusWindow(target, "focus-reveal suppression fallback");
            } else {
                log("No non-minimized fallback focus target found after focus-reveal suppression.");
            }
            return;
        }

        scheduleFocusReveal(activatedEntry, lastNonDockedFocus, "focus");
        return;
    }

    /*
     * A non-docked window has focus now. Remember it, cancel any pending
     * focus-triggered dock reveal, and hide any docked window that was revealed
     * or revealing.
     */
    cancelPendingFocusReveal("non-docked window activated");
    rememberNonDockedFocus(win, "windowActivated");
    log("Non-docked focus: " + win.caption);

    for (var i = 0; i < stowed.length; i++) {
        var entry = stowed[i];

        if (entry.state === "shown" || entry.state === "revealing") {
            entry.previousFocus = win;
            hideWindow(entry, false, "focus-lost");
        }
    }
}



function showKWinOutline(rect, reason) {
    if (!gestureIndicatorAvailable) {
        return false;
    }

    try {
        workspace.showOutline(rect);
        return true;
    } catch (e1) {
        try {
            workspace.showOutline(rect.x, rect.y, rect.width, rect.height);
            return true;
        } catch (e2) {
            log("Gesture indicator showOutline failed (" + reason + "): " + e2);
            gestureIndicatorAvailable = false;
        }
    }

    return false;
}

function hideKWinOutline(reason) {
    if (!gestureIndicatorAvailable) {
        return false;
    }

    try {
        workspace.hideOutline();
        return true;
    } catch (e1) {
        try {
            workspace.hideOutline();
            return true;
        } catch (e2) {
            /*
             * Older/newer KWin builds may not expose outline helpers to normal
             * scripts. This is non-fatal; gesture docking still works.
             */
        }
    }

    if (reason) {
        log("Gesture indicator hide skipped/unavailable (" + reason + ")");
    }

    return false;
}

function gestureEdgeStripGeometry(win, edge) {
    var area = dockAreaFor(win, edge);
    var original = copyRect(win.frameGeometry);
    var dockBase = fittedDockBaseGeometry(win, edge, area, original);
    var revealed = revealedGeometry(area, dockBase, edge);
    var thickness = Math.max(VISIBLE_STRIP_PIXELS, Math.min(48, Math.round(Math.min(area.width, area.height) * 0.03)));

    if (edge === "left") {
        return { x: area.x, y: revealed.y, width: thickness, height: revealed.height };
    }

    if (edge === "right") {
        return { x: area.x + area.width - thickness, y: revealed.y, width: thickness, height: revealed.height };
    }

    if (edge === "top") {
        return { x: revealed.x, y: area.y, width: revealed.width, height: thickness };
    }

    if (edge === "bottom") {
        return { x: revealed.x, y: area.y + area.height - thickness, width: revealed.width, height: thickness };
    }

    return revealed;
}

function gesturePopupTiles(anchor) {
    var tile = Math.max(18, GESTURE_SELECTOR_TILE_SIZE_PX);
    var dist = Math.max(tile + 6, GESTURE_SELECTOR_DISTANCE_PX);
    var half = Math.round(tile / 2);
    var cx = Math.round(anchor.x);
    var cy = Math.round(anchor.y);

    return {
        left: { x: cx - dist - half, y: cy - half, width: tile, height: tile },
        right: { x: cx + dist - half, y: cy - half, width: tile, height: tile },
        top: { x: cx - half, y: cy - dist - half, width: tile, height: tile },
        bottom: { x: cx - half, y: cy + dist - half, width: tile, height: tile }
    };
}

function gesturePopupEdgeFromCursor(p, anchor) {
    var tiles = gesturePopupTiles(anchor);
    var margin = GESTURE_SELECTOR_MARGIN_PX;

    if (pointInRect(p, tiles.left, margin)) return "left";
    if (pointInRect(p, tiles.right, margin)) return "right";
    if (pointInRect(p, tiles.top, margin)) return "top";
    if (pointInRect(p, tiles.bottom, margin)) return "bottom";

    return "";
}

function gestureIndicatorGeometry(win, edge) {
    if (GESTURE_SELECTOR_MODE === 1 && gestureActive && gestureActive.startCursor) {
        var tiles = gesturePopupTiles(gestureActive.startCursor);
        if (tiles[edge]) {
            return tiles[edge];
        }
    }

    return gestureEdgeStripGeometry(win, edge);
}

function showGestureIndicator(win, edge, logUpdate) {
    if (!GESTURE_INDICATOR_ENABLED || !win || !edge) {
        return;
    }

    try {
        var r = gestureIndicatorGeometry(win, edge);
        if (showKWinOutline(r, "gesture " + edge)) {
            if (logUpdate) {
                log("Gesture indicator: " + edge + " " + rectString(r));
            }
        }
    } catch (e) {
        log("Gesture indicator failed: " + e);
    }
}

function stopGestureIndicatorRefresh() {
    if (!gestureIndicatorRefreshTimer) {
        return;
    }

    try { gestureIndicatorRefreshTimer.stop(); } catch (e) {}
    gestureIndicatorRefreshTimer = null;
}

function startGestureIndicatorRefresh() {
    if (!GESTURE_INDICATOR_ENABLED || gestureIndicatorRefreshTimer) {
        return;
    }

    gestureIndicatorRefreshTimer = makeTimer(GESTURE_INDICATOR_REFRESH_MS, function() {
        if (!gestureActive || !gestureActive.win || !gestureActive.edge) {
            stopGestureIndicatorRefresh();
            return;
        }

        if (gestureActive.win.deleted || !isUsableWindow(gestureActive.win) || isDockedWindow(gestureActive.win)) {
            cancelGestureDock("indicator refresh target unavailable");
            return;
        }

        if (nowMs() - gestureActive.startedAt > GESTURE_DOCK_TIMEOUT_MS) {
            cancelGestureDock("timeout during indicator refresh");
            return;
        }

        showGestureIndicator(gestureActive.win, gestureActive.edge, false);
    });

    if (gestureIndicatorRefreshTimer) {
        gestureIndicatorRefreshTimer.start();
    }
}

function clearGestureIndicator(reason) {
    stopGestureIndicatorRefresh();

    if (!GESTURE_INDICATOR_ENABLED) {
        return;
    }

    hideKWinOutline(reason);
}


function gestureDirectionFromDelta(dx, dy) {
    var dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < GESTURE_DOCK_THRESHOLD_PX) {
        return "";
    }

    /*
     * Cone directions:
     *   right = near 0 degrees
     *   down  = near 90 degrees
     *   left  = near 180 degrees
     *   up    = near 270 degrees
     *
     * The remaining diagonal regions are deliberate blind spots so slightly
     * diagonal mouse movement does not accidentally choose a dock edge.
     */
    var angle = Math.atan2(dy, dx) * 180 / Math.PI;
    if (angle < 0) angle += 360;

    var cone = Math.max(10, Math.min(44, GESTURE_DOCK_CONE_DEGREES));

    if (angle <= cone || angle >= 360 - cone) return "right";
    if (Math.abs(angle - 90) <= cone) return "bottom";
    if (Math.abs(angle - 180) <= cone) return "left";
    if (Math.abs(angle - 270) <= cone) return "top";

    return "";
}

function armGestureDock(reason) {
    loadSettings("armGestureDock");

    if (!GESTURE_DOCK_ENABLED) {
        /*
         * The shortcut should still be useful even if the user forgot to turn
         * the checkbox on. Temporarily arm it anyway, but log the mismatch.
         */
        log("Gesture dock shortcut used while gesture dock setting is disabled; temporarily armed anyway.");
    }

    gestureArmedUntil = nowMs() + GESTURE_DOCK_TIMEOUT_MS;
    log("Gesture dock armed for " + GESTURE_DOCK_TIMEOUT_MS + "ms (" + reason + ")");
}

function gestureDockAllowed() {
    if (!GESTURE_DOCK_ENABLED && nowMs() > gestureArmedUntil) {
        return false;
    }

    if (GESTURE_DOCK_MODE === 1) {
        return true;
    }

    return nowMs() <= gestureArmedUntil;
}

function cancelGestureDock(reason) {
    if (gestureActive) {
        log("Gesture dock cancelled: " + reason);
    }

    clearGestureIndicator("gesture cancel: " + reason);
    gestureActive = null;
}

function beginGestureDock(win) {
    loadSettings("beginGestureDock");

    if (!gestureDockAllowed()) {
        return;
    }

    if (!win || !isUsableWindow(win) || isDockedWindow(win)) {
        return;
    }

    var p = workspace.cursorPos;

    gestureActive = {
        win: win,
        startCursor: { x: p.x, y: p.y },
        startGeometry: copyRect(win.frameGeometry),
        edge: "",
        indicatorShown: false,
        startedAt: nowMs()
    };

    log("Gesture dock started for " + win.caption +
        " at cursor x=" + p.x + " y=" + p.y +
        " mode=" + GESTURE_DOCK_MODE);
}

function updateGestureDock(win) {
    if (!gestureActive || gestureActive.win !== win) {
        return;
    }

    if (!win || win.deleted || !isUsableWindow(win) || isDockedWindow(win)) {
        cancelGestureDock("window unusable/docked");
        return;
    }

    if (nowMs() - gestureActive.startedAt > GESTURE_DOCK_TIMEOUT_MS) {
        cancelGestureDock("timeout");
        return;
    }

    var p = workspace.cursorPos;
    var dx = p.x - gestureActive.startCursor.x;
    var dy = p.y - gestureActive.startCursor.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var edge = "";
    if (GESTURE_SELECTOR_MODE === 1) {
        edge = gesturePopupEdgeFromCursor(p, gestureActive.startCursor);
    } else {
        edge = gestureDirectionFromDelta(dx, dy);
    }

    if (edge) {
        if (edge !== gestureActive.edge) {
            gestureActive.edge = edge;
            gestureActive.indicatorShown = true;
            showGestureIndicator(win, edge, true);
            startGestureIndicatorRefresh();
            log("Gesture dock direction selected: " + edge +
                " dx=" + dx + " dy=" + dy +
                " window=" + win.caption);
            return;
        }

        /*
         * KWin's outline can disappear quickly on some builds unless it is
         * refreshed while the interactive move continues.
         */
        showGestureIndicator(win, edge, false);
        return;
    }

    /*
     * Once a direction is selected, keep it through diagonal jitter. Otherwise
     * a normal hand-drag can enter a blind spot for one step, hide the outline,
     * and finish without docking. Moving back near the start point still cancels
     * the pending direction.
     */
    if (!edge && gestureActive.edge) {
        if (dist < Math.max(1, GESTURE_DOCK_THRESHOLD_PX / 2)) {
            log("Gesture dock direction cleared near start point.");
            gestureActive.edge = "";
            gestureActive.indicatorShown = false;
            clearGestureIndicator("gesture returned near start");
            return;
        }

        showGestureIndicator(win, gestureActive.edge, false);
    }
}

function finishGestureDock(win) {
    if (!gestureActive || gestureActive.win !== win) {
        return;
    }

    updateGestureDock(win);

    var edge = gestureActive.edge;
    var target = gestureActive.win;

    clearGestureIndicator("gesture finish");
    gestureActive = null;

    if (!edge) {
        log("Gesture dock finished without direction threshold.");
        return;
    }

    /*
     * Dock after KWin's interactive move operation finishes. Docking during
     * the move can be overwritten by KWin's final drag geometry.
     */
    log("Gesture dock applying: " + target.caption + " -> " + edge);
    dockWindow(target, edge);
}

function connectGestureSignals(win) {
    if (!win) return;

    var id = winId(win);
    if (gestureConnected[id]) {
        return;
    }

    gestureConnected[id] = true;

    try {
        win.interactiveMoveResizeStarted.connect(function() {
            beginGestureDock(win);
        });
        win.interactiveMoveResizeStepped.connect(function(geometry) {
            updateGestureDock(win);
        });
        win.interactiveMoveResizeFinished.connect(function() {
            finishGestureDock(win);
        });
        log("Connected gesture signals: " + win.caption);
    } catch (e) {
        log("Failed to connect gesture signals for " + (win.caption || id) + ": " + e);
    }
}


function dockActive(edge) {
    var win = workspace.activeWindow;

    if (win) {
        log("Shortcut received. Active window: " + win.caption +
            " edge=" + edge + " geom " + rectString(win.frameGeometry));
    } else {
        log("Shortcut received but no active window.");
    }

    dockWindow(win, edge);
}

registerShortcut("Touch Slide Window: Dock Left", "Touch Slide Window: Dock Left", "Meta+Ctrl+Alt+Left", function() { dockActive("left"); });
registerShortcut("Touch Slide Window: Dock Right", "Touch Slide Window: Dock Right", "Meta+Ctrl+Alt+Right", function() { dockActive("right"); });
registerShortcut("Touch Slide Window: Dock Top", "Touch Slide Window: Dock Top", "Meta+Ctrl+Alt+Up", function() { dockActive("top"); });
registerShortcut("Touch Slide Window: Dock Bottom", "Touch Slide Window: Dock Bottom", "Meta+Ctrl+Alt+Down", function() { dockActive("bottom"); });
registerShortcut("Touch Slide Window: Restore All", "Touch Slide Window: Restore All", "Meta+Ctrl+Alt+U", function() { undockAllWindows(true, "shortcut"); });
registerShortcut("Touch Slide Window: Reload Settings", "Touch Slide Window: Reload Settings", "Meta+Ctrl+Alt+R", function() { reloadSettingsViaKWinReconfigure("shortcut reload"); });
registerShortcut("Touch Slide Window: Test Attention Poke", "Touch Slide Window: Test Attention Poke", "Meta+Ctrl+Alt+P", function() { attentionPokeAll("shortcut"); });
registerShortcut("Touch Slide Window: Arm Gesture Dock", "Touch Slide Window: Arm Gesture Dock", "Meta+G", function() { armGestureDock("shortcut"); });

registerShortcut("Touch Slide Window: Open Settings", "Touch Slide Window: Open Settings", "", function() { openSettingsGui(); });

registerUserActionsMenu(function(win) {
    if (!isUsableWindow(win)) return null;

    var existing = findEntry(win);
    var menuItems = [];

    if (existing) {
        menuItems = [
            { title: "Undock", text: "Undock", triggered: function() { undockWindow(existing, true); } },
            {
                title: "More",
                text: "More",
                items: [
                    { title: "Open Settings", text: "Open Settings", triggered: function() { openSettingsGui(); } },
                    { title: "Test Attention Poke", text: "Test Attention Poke", triggered: function() { attentionPokeAll("menu single/all"); } },
                    { title: "Restore All Docked Windows", text: "Restore All Docked Windows", triggered: function() { undockAllWindows(true, "menu"); } },
                    { title: "Reload Settings", text: "Reload Settings", triggered: function() { reloadSettingsViaKWinReconfigure("menu reload"); } }
                ]
            }
        ];
    } else {
        menuItems = [
            { title: "Left", text: "Left", triggered: function() { dockWindow(win, "left"); } },
            { title: "Right", text: "Right", triggered: function() { dockWindow(win, "right"); } },
            { title: "Top", text: "Top", triggered: function() { dockWindow(win, "top"); } },
            { title: "Bottom", text: "Bottom", triggered: function() { dockWindow(win, "bottom"); } },
            {
                title: "More",
                text: "More",
                items: [
                    { title: "Arm Gesture Dock", text: "Arm Gesture Dock", triggered: function() { armGestureDock("menu"); } },
                    { title: "Open Settings", text: "Open Settings", triggered: function() { openSettingsGui(); } },
                    { title: "Test All Attention Pokes", text: "Test All Attention Pokes", triggered: function() { attentionPokeAll("menu"); } },
                    { title: "Restore All Docked Windows", text: "Restore All Docked Windows", triggered: function() { undockAllWindows(true, "menu"); } },
                    { title: "Reload Settings", text: "Reload Settings", triggered: function() { reloadSettingsViaKWinReconfigure("menu reload"); } }
                ]
            }
        ];
    }

    return {
        title: "Touch Slide Window  ",
        text: "Touch Slide Window  ",
        items: menuItems
    };
});

workspace.cursorPosChanged.connect(checkCursor);
function onWindowRemoved(win) {
    /*
     * KWin can add/remove short-lived internal windows during interactive move
     * and outline display. Do not let those unrelated removals cancel the
     * active gesture for the real dragged window.
     */
    if (gestureActive && gestureActive.win === win) {
        cancelGestureDock("gesture target window removed");
    }

    try { delete gestureConnected[winId(win)]; } catch (e0) {}

    /*
     * If a normal/non-docked window closes, KWin may focus the hidden docked
     * window because it was recently active. Treat that as fallback focus,
     * not a deliberate Alt-Tab to the docked window.
     */
    cancelPendingFocusReveal("window removed");
    var entry = findEntry(win);

    if (entry) {
        removeEntry(entry);
        return;
    }

    suppressFocusRevealFor(3000, "non-docked window removed");
}

workspace.windowRemoved.connect(onWindowRemoved);

try {
    workspace.windowActivated.connect(onWindowActivated);
    log("Connected windowActivated.");
} catch (e) {
    log("Failed to connect windowActivated: " + e);
}

try {
    if (workspace.activeWindow && isFocusableWindow(workspace.activeWindow) && !isDockedWindow(workspace.activeWindow)) {
        rememberNonDockedFocus(workspace.activeWindow, "startup");
        log("Initial non-docked focus: " + workspace.activeWindow.caption);
    }
} catch (e2) {}

try {
    workspace.windowAdded.connect(function(win) {
        connectCloseSuppressor(win);
        connectAttentionSignal(win);
        connectGestureSignals(win);

        /*
         * Opening apps through the launcher can make KWin briefly focus a
         * hidden docked window while the new app window is being created.
         * Suppress focus-triggered reveal during that short launch window.
         * Hover reveal is unaffected.
         */
        try {
            if (win && isFocusableWindow(win) && !isDockedWindow(win)) {
                suppressFocusRevealFor(NEW_WINDOW_SUPPRESS_MS, "new non-docked window added");
                cancelPendingFocusReveal("new non-docked window added");
            }
        } catch (eAdd) {}
    });
    log("Connected windowAdded close suppressor.");
} catch (e3) {
    log("Failed to connect windowAdded: " + e3);
}

try {
    var existing = workspace.stackingOrder;
    for (var i = 0; i < existing.length; i++) { connectCloseSuppressor(existing[i]); connectAttentionSignal(existing[i]); connectGestureSignals(existing[i]); }
    log("Connected close suppressors to existing windows.");
} catch (e4) {
    log("Could not connect close suppressors to existing windows: " + e4);
}

loadSettings("startup");

try {
    settingsPollTimer = makeTimer(750, function() {
        loadSettings("poll");
    });
    if (settingsPollTimer) {
        settingsPollTimer.start();
        log("Started settings poll timer.");
    }
} catch (e5) {
    log("Failed to start settings poll timer: " + e5);
}


log("Loaded.");
