import React, { useEffect, useRef } from "react";

const Utterances: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || ref.current.querySelector("script")) return;

    const script = document.createElement("script");
    script.src = "https://utteranc.es/client.js";
    script.setAttribute("repo", "sagnikc395/sagnikc395.github.io");
    script.setAttribute("issue-term", "pathname");
    script.setAttribute("theme", "github-dark");
    script.setAttribute("crossorigin", "anonymous");
    script.async = true;
    ref.current.appendChild(script);
  }, []);

  return (
    <div className="mt-12 pt-8 border-t border-stone-700">
      <h2 className="text-stone-300 text-lg font-semibold mb-6">Comments</h2>
      <div ref={ref} />
    </div>
  );
};

export default Utterances;
