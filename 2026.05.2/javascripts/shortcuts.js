(function () {
  "use strict";

  // Shared shortcut IDs name IDE actions or interaction patterns, not BetterPy features.
  var shortcutLabels = {
    "show-context-actions": {
      mac: "⌥⏎",
      windows: "Alt+Enter",
      linux: "Alt+Enter",
      fallback: "⌥⏎ / Alt+Enter",
    },
    "quick-documentation": {
      mac: "F1",
      windows: "Ctrl+Q",
      linux: "Ctrl+Q",
      fallback: "F1 / Ctrl+Q",
    },
    "generate": {
      mac: "⌘N",
      windows: "Alt+Insert",
      linux: "Alt+Insert",
      fallback: "⌘N / Alt+Insert",
    },
    "find-usages": {
      mac: "⌥F7",
      windows: "Alt+F7",
      linux: "Alt+F7",
      fallback: "⌥F7 / Alt+F7",
    },
    "search-everywhere": {
      mac: "Double Shift",
      windows: "Double Shift",
      linux: "Double Shift",
      fallback: "Double Shift",
    },
    "structure-tool-window": {
      mac: "⌘7",
      windows: "Alt+7",
      linux: "Alt+7",
      fallback: "⌘7 / Alt+7",
    },
    "rename": {
      mac: "⇧F6",
      windows: "Shift+F6",
      linux: "Shift+F6",
      fallback: "⇧F6 / Shift+F6",
    },
    "go-to-declaration-mouse": {
      mac: "⌘+Click",
      windows: "Ctrl+Click",
      linux: "Ctrl+Click",
      fallback: "⌘+Click / Ctrl+Click",
    },
    "go-to-declaration": {
      mac: "⌘B",
      windows: "Ctrl+B",
      linux: "Ctrl+B",
      fallback: "⌘B / Ctrl+B",
    },
    "go-to-implementation": {
      mac: "⌥⌘B",
      windows: "Ctrl+Alt+B",
      linux: "Ctrl+Alt+B",
      fallback: "⌥⌘B / Ctrl+Alt+B",
    },
  };

  function platformText() {
    var userAgentData = window.navigator.userAgentData;
    if (userAgentData && typeof userAgentData.platform === "string") {
      return userAgentData.platform;
    }

    return [
      window.navigator.platform || "",
      window.navigator.userAgent || "",
    ].join(" ");
  }

  function detectOs() {
    var platform = platformText().toLowerCase();

    if (platform.indexOf("mac") !== -1 || platform.indexOf("iphone") !== -1 || platform.indexOf("ipad") !== -1) {
      return "mac";
    }
    if (platform.indexOf("win") !== -1) {
      return "windows";
    }
    if (platform.indexOf("linux") !== -1 || platform.indexOf("x11") !== -1 || platform.indexOf("cros") !== -1) {
      return "linux";
    }
    return "unknown";
  }

  function applyShortcutOs() {
    var os = detectOs();
    var placeholders = document.querySelectorAll("[data-bp-shortcut]");

    document.documentElement.dataset.bpOs = os;
    placeholders.forEach(function (placeholder) {
      var id = placeholder.dataset.bpShortcut;
      var shortcut = shortcutLabels[id];
      if (!shortcut) {
        return;
      }

      placeholder.textContent = shortcut[os] || shortcut.fallback || placeholder.textContent;
    });
    document.documentElement.classList.add("bp-shortcuts-ready");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyShortcutOs, { once: true });
  } else {
    applyShortcutOs();
  }

  if (typeof document$ !== "undefined" && typeof document$.subscribe === "function") {
    document$.subscribe(applyShortcutOs);
  }
})();
