import React, { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { readTheme, resolvedTheme, setTheme, subscribe } from "../theme";
import type { Theme } from "../theme";

/** Prerendered HTML knows nothing about the visitor's choice, so the server
    snapshots are the "system"/light defaults; useSyncExternalStore swaps in
    the real ones right after hydration without tripping a mismatch. */
const serverTheme = (): Theme => "system";
const serverResolved = (): "light" | "dark" => "light";

const FACE = { light: "☀️", dark: "🌕" } as const;

const OPTIONS: { value: Theme; label: string }[] = [
  { value: "light", label: `${FACE.light} Light` },
  { value: "dark", label: `${FACE.dark} Dark` },
  { value: "system", label: "🌗 System" },
];

const ThemeToggle: React.FC = () => {
  const theme = useSyncExternalStore(subscribe, readTheme, serverTheme);
  const resolved = useSyncExternalStore(
    subscribe,
    resolvedTheme,
    serverResolved,
  );
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLSpanElement>(null);

  /* A click anywhere else, or Escape, dismisses the menu. */
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <span className="theme-picker" ref={root}>
      <button
        type="button"
        className="theme-toggle"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Theme: ${theme}`}
        title={`Theme: ${theme}`}
        onClick={() => setOpen(!open)}
      >
        <span aria-hidden="true">{FACE[resolved]}</span>
      </button>

      {open && (
        <span className="theme-menu" role="menu">
          {OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="menuitemradio"
              aria-checked={theme === option.value}
              onClick={() => {
                setTheme(option.value);
                setOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </span>
      )}
    </span>
  );
};

export default ThemeToggle;
