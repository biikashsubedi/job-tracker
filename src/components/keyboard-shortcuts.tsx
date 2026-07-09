"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** id set on the Applications search input so "/" can focus it */
export const SEARCH_INPUT_ID = "app-search";

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    el.isContentEditable
  );
}

export function KeyboardShortcuts() {
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      // don't hijack keys while a dialog/menu is open
      if (document.querySelector('[role="dialog"],[role="alertdialog"]')) return;

      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        router.push("/?new=1");
      } else if (e.key === "/") {
        const input = document.getElementById(SEARCH_INPUT_ID);
        if (input instanceof HTMLInputElement) {
          e.preventDefault();
          input.focus();
        } else {
          // not on the Applications page — go there, where search lives
          router.push("/");
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);

  return null;
}
