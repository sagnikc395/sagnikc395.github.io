import React, { useEffect, useRef } from "react";
import { cancelIdleRun, runWhenIdle } from "../idle";

const Utterances: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || ref.current.querySelector("script")) return;

    const container = ref.current;
    const handle = runWhenIdle(() => {
      if (container.querySelector("script")) return;

      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)",
      ).matches;

      const script = document.createElement("script");
      script.src = "https://utteranc.es/client.js";
      script.setAttribute("repo", "sagnikc395/sagnikc395.github.io");
      script.setAttribute("issue-term", "pathname");
      script.setAttribute(
        "theme",
        prefersDark ? "github-dark" : "github-light",
      );
      script.setAttribute("crossorigin", "anonymous");
      script.async = true;
      container.appendChild(script);
    });

    return () => {
      cancelIdleRun(handle);
    };
  }, []);

  return (
    <section>
      <h2>Comments</h2>
      <div ref={ref} />
    </section>
  );
};

export default Utterances;
