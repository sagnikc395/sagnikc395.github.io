type IdleHandle = {
  id: number;
  type: "idle" | "timeout";
};

export function runWhenIdle(callback: () => void, timeout = 1500): IdleHandle {
  if (typeof window.requestIdleCallback === "function") {
    return {
      id: window.requestIdleCallback(callback, { timeout }),
      type: "idle",
    };
  }

  return {
    id: globalThis.setTimeout(callback, 0),
    type: "timeout",
  };
}

export function cancelIdleRun(handle: IdleHandle) {
  if (
    handle.type === "idle" &&
    typeof window.cancelIdleCallback === "function"
  ) {
    window.cancelIdleCallback(handle.id);
    return;
  }

  globalThis.clearTimeout(handle.id);
}
