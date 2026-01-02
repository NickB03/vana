import { useEffect } from "react";

const IOS_UA_REGEX = /iPad|iPhone|iPod/;

export function useIOSViewportHeight() {
  useEffect(() => {
    const isIOS =
      IOS_UA_REGEX.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    if (!isIOS) return;

    const root = document.documentElement;
    let rafId = 0;
    let focusTimeout: number | undefined;
    let settleTimeout: number | undefined;
    // Stores the "stable" height before keyboard opens - prevents layout jumps
    let stableHeight: number | null = null;

    const updateHeight = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const viewport = window.visualViewport;
        const height = viewport?.height ?? window.innerHeight;
        const offsetTop = viewport?.offsetTop ?? 0;
        const keyboardInset = Math.max(0, window.innerHeight - height - offsetTop);

        // Always update keyboard inset (for other calculations if needed)
        root.style.setProperty("--keyboard-inset", `${Math.round(keyboardInset)}px`);

        // Only update stable height when:
        // 1. Keyboard is not marked as open, AND
        // 2. Keyboard inset is near zero (keyboard fully dismissed)
        // This prevents capturing the "shrunk" height during keyboard animation
        const keyboardOpen = root.dataset.keyboard === "open";
        const keyboardVisible = keyboardInset > 20;

        if (!keyboardOpen && !keyboardVisible) {
          stableHeight = height;
        }

        // Use stable height for --app-height to prevent layout jumps
        // Falls back to current height only if stable height not yet captured
        const appHeight = stableHeight ?? height;
        root.style.setProperty("--app-height", `${Math.round(appHeight)}px`);
      });
    };

    updateHeight();

    const isEditableElement = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      const tagName = target.tagName.toLowerCase();
      return (
        tagName === "input" ||
        tagName === "textarea" ||
        target.isContentEditable
      );
    };

    const syncKeyboardState = (state: "open" | "closed") => {
      root.dataset.keyboard = state;
    };

    const handleFocusIn = (event: FocusEvent) => {
      if (!isEditableElement(event.target)) return;
      syncKeyboardState("open");
      updateHeight();
    };

    const handleFocusOut = () => {
      if (focusTimeout) window.clearTimeout(focusTimeout);
      if (settleTimeout) window.clearTimeout(settleTimeout);

      // Mark keyboard as closing immediately
      focusTimeout = window.setTimeout(() => {
        if (!isEditableElement(document.activeElement)) {
          syncKeyboardState("closed");
          updateHeight();
        }
      }, 50);

      // Wait for keyboard animation to complete before resetting stable height
      // iOS keyboard animations take ~300-400ms
      settleTimeout = window.setTimeout(() => {
        if (!isEditableElement(document.activeElement)) {
          // Force recapture of full viewport height after keyboard fully dismissed
          stableHeight = null;
          updateHeight();
        }
      }, 400);
    };

    const handleOrientationChange = () => {
      // Reset stable height on orientation change to recapture new dimensions
      stableHeight = null;
      updateHeight();
      if (focusTimeout) window.clearTimeout(focusTimeout);
      if (settleTimeout) window.clearTimeout(settleTimeout);
      focusTimeout = window.setTimeout(updateHeight, 50);
      settleTimeout = window.setTimeout(updateHeight, 300);
    };

    const viewport = window.visualViewport;
    if (viewport) {
      viewport.addEventListener("resize", updateHeight);
      viewport.addEventListener("scroll", updateHeight);
    } else {
      window.addEventListener("resize", updateHeight);
    }
    window.addEventListener("focusin", handleFocusIn);
    window.addEventListener("focusout", handleFocusOut);
    window.addEventListener("orientationchange", handleOrientationChange);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (focusTimeout) window.clearTimeout(focusTimeout);
      if (settleTimeout) window.clearTimeout(settleTimeout);
      if (viewport) {
        viewport.removeEventListener("resize", updateHeight);
        viewport.removeEventListener("scroll", updateHeight);
      } else {
        window.removeEventListener("resize", updateHeight);
      }
      window.removeEventListener("focusin", handleFocusIn);
      window.removeEventListener("focusout", handleFocusOut);
      window.removeEventListener("orientationchange", handleOrientationChange);
      delete root.dataset.keyboard;
    };
  }, []);
}
