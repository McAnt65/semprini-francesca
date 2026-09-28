"use client";

import { useSyncExternalStore } from "react";

const changed = "semprini:materie:changed";

function subscribe(listener: () => void) {
  window.addEventListener(changed, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(changed, listener);
    window.removeEventListener("storage", listener);
  };
}

export function useLocalText(key: string) {
  return useSyncExternalStore(subscribe, () => {
    try { return window.localStorage.getItem(key) || ""; }
    catch { return ""; }
  }, () => "");
}

export function saveLocalText(key: string, text: string) {
  try {
    window.localStorage.setItem(key, text);
    window.dispatchEvent(new Event(changed));
    return true;
  } catch { return false; }
}
