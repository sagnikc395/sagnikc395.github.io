import React, { useEffect, useRef } from "react";
import { cancelIdleRun, runWhenIdle } from "../idle";
import { resolvedTheme, subscribe } from "../theme";

const ORIGIN = "https://utteranc.es";

const widgetTheme = () =>
  resolvedTheme() === "dark" ? "github-dark" : "github-light";

const Utterances: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || ref.current.querySelector("script")) return;

    const container = ref.current;
    const handle = runWhenIdle(() => {
      if (container.querySelector("script")) return;

      const script = document.createElement("script");
      script.src = `${ORIGIN}/client.js`;
      script.setAttribute("repo", "sagnikc395/sagnikc395.github.io");
      script.setAttribute("issue-term", "pathname");
      script.setAttribute("theme", widgetTheme());
      script.setAttribute("crossorigin", "anonymous");
      script.async = true;
      container.appendChild(script);
    });

    return () => {
      cancelIdleRun(handle);
    };
  }, []);

  // The widget is an iframe, so a theme change reaches it by postMessage.
  useEffect(
    () =>
      subscribe(() => {
        const frame = ref.current?.querySelector("iframe");
        frame?.contentWindow?.postMessage(
          { type: "set-theme", theme: widgetTheme() },
          ORIGIN,
        );
      }),
    [],
  );

  return (
    <section>
      <h2>Comments</h2>
      <div ref={ref} />
    </section>
  );
};

export default Utterances;
