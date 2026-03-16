import React from "react";
import { Download } from "lucide-react";
import Seo from "../lib/components/Seo";
import Workplace from "../lib/components/Workplace";

const Resume: React.FC = () => {
  return (
    <>
      <Seo
        title="Sagnik Chatterjee – Resume"
        description="Graduate CS student exploring NLP, program synthesis, and biomedical applications"
      />

      <section className="layout-md my-6">
        <h3 className="text-lg font-semibold flex items-center gap-3 text-stone-100">
          <span>Download a PDF version of my resume</span>
          <a
            href="/assets/pdf/SagnikChatterjee-Resume.pdf"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white transition"
          >
            <Download className="w-5 h-5" />
            <span>PDF</span>
          </a>
        </h3>
      </section>

      <section className="layout-md py-12 space-y-10">
        {/* Education */}
        <div>
          <h2 className="heading2 mb-4">Education</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-end">
                <h3 className="text-lg font-semibold text-stone-100">
                  University of Massachusetts, Amherst
                </h3>
                <p className="text-stone-400 text-sm">2025 — 2027</p>
              </div>
              <p className="font-serif italic text-stone-300">
                M.S. in Computer Science
              </p>
            </div>

            <div>
              <div className="flex justify-between items-end">
                <h3 className="text-lg font-semibold text-stone-100">
                  Manipal Institute of Technology, Manipal
                </h3>
                <p className="text-stone-400 text-sm">2018 — 2022</p>
              </div>
              <p className="font-serif italic text-stone-300">
                B.Tech in Computer Science & Engineering
              </p>
            </div>
          </div>
        </div>

        {/* Research */}
        <div>
          <h2 className="heading2 mb-4">Research Experience</h2>
          <div>
            <h3 className="font-medium mb-2 text-stone-100">
              Graduate Research (Fall 2025)
            </h3>
            <Workplace
              title="Graduate Student Researcher"
              company="UMass Amherst"
              url="https://bio-nlp.github.io/"
              dates="Sept 2025 – Dec 2025"
              location="Amherst, MA"
            />
            <ul className="mt-2 list-none p-0 m-0">
              <li className="py-2 hover:bg-stone-800/50 rounded-md px-2 text-stone-300">
                Independent Study: Working in UMass BioNLP Lab with Sunjae Kwon
                on Ontology-based LLMs for Biomedical Applications
              </li>
            </ul>
          </div>
        </div>

        {/* Coursework */}
        <div className="space-y-12">
          <div>
            <h2 className="heading2 mb-6">Coursework</h2>

            {/* Current Courses */}
            <div className="mb-10">
              <h3 className="text-sm font-medium text-stone-500 uppercase tracking-wider mb-4">
                Currently Taking (Spring 2026)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  {
                    id: "COMPSCI 590NN",
                    name: "Neural Networks in AI and Neuroscience",
                  },
                  { id: "COMPSCI 690U", name: "Computational Biology" },
                  { id: "COMPSCI 520", name: "Software Engineering" },
                ].map((course) => (
                  <div
                    key={course.id}
                    className="group flex flex-col p-4 bg-stone-900/50 border border-stone-800 rounded-xl hover:border-blue-500/50 transition-all duration-300"
                  >
                    <span className="text-stone-500 text-xs font-mono mb-1">
                      {course.id}
                    </span>
                    <span className="text-stone-100 font-medium group-hover:text-blue-400 transition-colors">
                      {course.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Graduate (Completed) */}
            <div className="mb-10">
              <h3 className="text-sm font-medium text-stone-500 uppercase tracking-wider mb-4">
                Graduate (Fall 2025)
              </h3>
              <div className="flex flex-wrap gap-2">
                {[
                  {
                    id: "COMPSCI 685",
                    name: "Advanced Natural Language Processing",
                  },
                  { id: "COMPSCI 689", name: "Advanced Machine Learning" },
                ].map((course) => (
                  <div
                    key={course.id}
                    className="px-4 py-2 bg-stone-900/30 border border-stone-800 rounded-lg flex items-center gap-3"
                  >
                    <span className="text-stone-500 text-xs font-mono">
                      {course.id}
                    </span>
                    <span className="text-stone-300 text-sm font-medium">
                      {course.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Undergraduate */}
            <div>
              <h3 className="text-sm font-medium text-stone-500 uppercase tracking-wider mb-4">
                Undergraduate-level
              </h3>
              <div className="flex flex-wrap gap-2">
                {[
                  "Compilers",
                  "Operating Systems",
                  "Distributed Systems",
                  "Computer Networks",
                  "Machine Learning",
                  "Deep Learning",
                  "Computer Vision",
                ].map((course) => (
                  <span
                    key={course}
                    className="px-3 py-1.5 bg-stone-900/20 border border-stone-800/50 rounded-full text-stone-400 text-sm font-serif italic"
                  >
                    {course}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Work */}
        <div>
          <h2 className="heading2 mb-4">Professional Experience</h2>
          <Workplace
            title="Software Developer"
            company="IBM"
            url="https://ibm.com/"
            dates="Aug 2022 – Aug 2025"
            location="Gurgaon, IN"
          >
            <ul className="divide-y divide-stone-800 list-none p-0 m-0">
              <li className="py-2 hover:bg-stone-800/50 rounded-md px-2 text-stone-300">
                Backend Developer integrating IBM Watson systems with Siebel
                CRM.
              </li>
            </ul>
          </Workplace>
        </div>
      </section>
    </>
  );
};

export default Resume;
