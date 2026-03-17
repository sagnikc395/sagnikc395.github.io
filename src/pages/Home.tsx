import React, { useEffect } from "react";
import Seo from "../lib/components/Seo";

const Home: React.FC = () => {
  useEffect(() => {
    const script = document.createElement("script");
    script.id = "umaring_js";
    script.src = "https://umaring.mkr.cx/ring.js?id=sagnikc395";
    script.async = true;
    document.body.appendChild(script);

    return () => {
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
        description="Software engineer, researcher interested in program synthesis."
      />

      <p
        className="layout-md text-stone-500 text-xl md:text-lg leading-tight font-light mb-16 p-2 max-[420px]:-mt-10"
        id="sagnik-is"
      >
        <div className="neutral">is a</div>
        software engineer<span className="neutral">, ai fanboy </span>
        <br />
        and researcher<span className="neutral"></span>
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
            <img
              alt="sagnik chilling in his natural place"
              src="/assets/images/profile2.jpeg"
              className="rounded-xl w-64 object-cover"
            />
          </div>

          {/* Text Content */}
          <div className="w-full md:w-2/3 space-y-5">
            <p className="text-xl font-semibold">Hi, I’m Sagnik 👋</p>

            <p className="text-lg md:text-xl">
              I work at the intersection of <b>computational biology and AI</b>,
              with a focus on{" "}
              <b>drug discovery using protein language models</b> and
              large-scale biological sequence modeling. I'm interested in
              building
              <b>knowledge-aware AI systems</b> that can reason over biological
              data and uncover functional insights from proteins, pathways, and
              molecular interactions.
            </p>

            <p>
              My work brings together ideas from{" "}
              <b>
                biomedical NLP, biological foundation models, and knowledge
                representation
              </b>
              . I'm particularly interested in integrating structured biomedical
              knowledge—such as ontologies and knowledge graphs like{" "}
              <b>SNOMED CT</b> and <b>MeSH</b>—with modern language models to
              improve reasoning, grounding, and reliability in scientific AI
              systems. More broadly, I’m curious about how these approaches
              intersect with <b>program synthesis and machine reasoning</b>,
              especially in the context of complex biological discovery
              workflows.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center space-y-6">
          <p className="text-center text-lg md:text-xl">
            I'm also building a digital garden of my knowledge base and
            unfinished writings <br />
            Follow here:
            <a
              href="https://sagnikc395.github.io/knowledge-base/"
              className="underline italic"
              rel="noreferrer"
              target="_blank"
            >
              sagnik's digital garden
            </a>
          </p>

          <div className="bg-[#881c1c] p-[15px] rounded-[12px] inline-block shadow-[0_4px_15px_rgba(0,0,0,0.1)] transition-transform duration-300 ease-in-out border-2 border-[#5e1414] font-sans hover:translate-y-[-5px] hover:shadow-[0_8px_25px_rgba(136,28,28,0.3)]">
            <div
              id="umaring"
              className="text-white !no-underline font-bold"
            ></div>
          </div>
        </div>

        <hr className="border-stone-800" />
        {/* other stuff that interests me */}
        <div className="text-center text-stone-200 pb-10 flex flex-col">
          <p>
            Other interests: endurance running, watching{" "}
            <a
              href="https://www.youtube.com/shorts/pch-oIxAnUg"
              className="p-2 underline"
            >
              F1
            </a>{" "}
            and
            <a
              href="https://www.youtube.com/shorts/vJqNDSuiEJ8"
              className="
			p-2 underline"
            >
              Premier League
            </a>
            , and I also
            <a
              className="p-2 underline"
              href="https://substack.com/@sagnietzche"
            >
              write about
            </a>
            TV shows and movies
          </p>
        </div>
      </div>
    </>
  );
};

export default Home;
