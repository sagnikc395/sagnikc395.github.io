import React from "react";
import Seo from "../lib/components/Seo";
import Markdown from "../lib/components/Markdown";

const ideasData = import.meta.glob("../ideas.md", {
  eager: true,
}) as Record<string, any>;

const ideas = Object.values(ideasData)[0];
const data = ideas?.default || ideas;

const Ideas: React.FC = () => {
  return (
    <>
      <Seo
        title="Sagnik Chatterjee - Ideas"
        description="project ideas, research directions, and things I'm thinking about"
      />

      <section className="layout-md">
        <h1 className="text-2xl font-bold mb-6 text-stone-100">Ideas</h1>
        <p className="text-sm md:text-lg mb-4 text-stone-400">
          <em>project ideas, research directions, and things I'm thinking about</em>
        </p>

        <hr className="mb-8 border-stone-800" />

        <div className="prose prose-stone prose-invert prose-headings:font-semibold prose-headings:text-stone-100 prose-p:text-stone-300 prose-a:text-blue-600 hover:prose-a:text-blue-800 max-w-none">
          <Markdown source={data.content} />
        </div>
      </section>
    </>
  );
};

export default Ideas;
