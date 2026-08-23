import React, { useEffect } from "react";
import Seo from "../lib/components/Seo";
import { cancelIdleRun, runWhenIdle } from "../lib/idle";

const Home: React.FC = () => {
  useEffect(() => {
    const handle = runWhenIdle(() => {
      if (document.getElementById("umaring_js")) return;

      const script = document.createElement("script");
      script.id = "umaring_js";
      script.src = "https://umaring.mkr.cx/ring.js?id=sagnikc395&mode=link";
      script.async = true;
      document.body.appendChild(script);
    });

    return () => {
      cancelIdleRun(handle);
      const existingScript = document.getElementById("umaring_js");
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);

  return (
    <>
      <Seo
        title="Sagnik Chatterjee"
        description="CS grad student focused on mechanistic interpretability and building AI agents."
      />

      <p
        className="layout-md text-stone-500 text-xl md:text-lg leading-tight font-light mb-16 p-2 max-[420px]:-mt-10"
        id="sagnik-is"
      >
        <span className="neutral">is a </span>
        cs grad student<span className="neutral">, mech interp nerd </span>
        <br />
        and agent builder
        <br />
      </p>

      <div className="layout-md text-lg md:text-xl space-y-14 max-w-4xl mx-auto">
        {/* hero */}
        <div className="flex flex-col md:flex-row items-center md:items-start space-y-10 md:space-y-0 md:space-x-10">
          {/* Profile Image */}
          <div
            className="w-full md:w-1/3 flex justify-center items-center md:justify-start"
            style={{ alignSelf: "stretch" }}
          >
            <picture>
              <source
                srcSet="/assets/images/profile2-512.webp"
                type="image/webp"
              />
              <img
                alt="sagnik chilling in his natural place"
                src="/assets/images/profile2.jpeg"
                width="256"
                height="341"
                loading="eager"
                decoding="async"
                fetchPriority="high"
                className="rounded-xl w-64 object-cover"
              />
            </picture>
          </div>

          {/* Text Content */}
          <div className="w-full md:w-2/3 space-y-5">
            <p className="text-xl font-semibold">Hi, I'm Sagnik 👋</p>

            <p className="text-lg md:text-xl">
              I work on <b>mechanistic interpretability</b> and <b>AI agents</b>
              , with a focus on understanding{" "}
              <b>what's actually happening inside neural networks</b> and
              building systems that can <b>reason, plan, and act</b> in the
              world. I'm interested in reverse-engineering model internals,
              including circuits, features, and attention patterns, and using
              those insights to build more reliable and steerable AI systems.
            </p>

            <p>
              My work sits at the intersection of{" "}
              <b>
                interpretability research, agent architectures, and language
                model behavior
              </b>
              . I'm particularly drawn to questions about how capabilities
              emerge in transformers, including{" "}
              <b>superposition, polysemanticity, and in-context learning</b>,
              and how a clearer mechanistic picture can inform the design of
              better <b>tool-using and reasoning agents</b>. More broadly, I
              care about making AI systems we can actually understand and trust.
            </p>
          </div>
        </div>

        <nav className="umaring" aria-label="UMass Amherst web ring">
          <p className="umaring-label">
            <span aria-hidden="true" className="umaring-dot" />
            UMass web ring
          </p>

          <div className="umaring-links">
            <a id="umaring_prev" className="umaring-link umaring-link-prev">
              Previous site
            </a>
            <span className="umaring-divider" aria-hidden="true" />
            <a id="umaring_next" className="umaring-link umaring-link-next">
              Next site
            </a>
          </div>
        </nav>
      </div>
    </>
  );
};

export default Home;
