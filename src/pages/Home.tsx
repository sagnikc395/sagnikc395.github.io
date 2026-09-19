import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import Seo from "../lib/components/Seo";
import { cancelIdleRun, runWhenIdle } from "../lib/idle";
import { formatTime } from "../lib/utils";

const postModules = import.meta.glob("../posts/*.md", {
  eager: true,
  query: "?meta",
}) as Record<string, any>;

const projectModules = import.meta.glob("../projects/*.md", {
  eager: true,
  query: "?meta",
}) as Record<string, any>;

function entriesFrom(modules: Record<string, any>, limit: number) {
  return Object.entries(modules)
    .map(([path, mod]) => ({
      slug: path.split("/").pop()?.replace(".md", ""),
      ...(mod.default || mod),
    }))
    .filter((entry) => !entry.draft)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);
}

const recentPosts = entriesFrom(postModules, 5);
const recentProjects = entriesFrom(projectModules, 4);

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
      document.getElementById("umaring_js")?.remove();
    };
  }, []);

  return (
    <>
      <Seo
        title="Sagnik Chatterjee"
        description="CS grad student focused on mechanistic interpretability and building AI agents."
      />

      <section className="wrap">
        <div className="intro">
          <picture>
            <img
              className="intro-photo"
              alt="Sagnik Chatterjee"
              src="/assets/images/sagnik2.jpeg"
              width="130"
              height="173"
              loading="eager"
              decoding="async"
              fetchPriority="high"
            />
          </picture>

          <p>
            CS graduate student
            <br />
            Manning College of Information and Computer Sciences
            <br />
            University of Massachusetts Amherst
          </p>

          <p>
            Email:{" "}
            <a href="mailto:sagnikchatte@umass.edu">sagnikchatte@umass.edu</a>
          </p>
        </div>

        <h2>Research interests</h2>

        <p>
          Mechanistic interpretability and AI agents. I work on
          reverse-engineering model internals (circuits, features, and
          attention patterns) and on using what that reveals to build systems
          that reason, plan, and act more reliably. I am particularly drawn to
          how capabilities emerge in transformers (superposition,
          polysemanticity, in-context learning), and to what a clearer
          mechanistic picture implies for the design of tool-using agents.
        </p>

        <h2>Writing</h2>

        <ul className="entries">
          {recentPosts.map((post) => (
            <li key={post.slug}>
              <Link to={`/blog/${post.slug}`}>{post.title}</Link>
              <br />
              <span className="entry-meta small">
                {formatTime("%d %B %Y", post.date)}
              </span>
            </li>
          ))}
        </ul>

        <p>
          <Link to="/blog">All posts</Link>
        </p>

        <h2>Projects</h2>

        <ul className="entries">
          {recentProjects.map((project) => (
            <li key={project.slug}>
              <Link to={`/project/${project.slug}`}>{project.title}</Link>
              {project.date && (
                <span className="entry-meta">
                  {" "}
                  · {formatTime("%Y", project.date)}
                </span>
              )}
              {project.lead && <p className="entry-note">{project.lead}</p>}
            </li>
          ))}
        </ul>

        <p>
          <Link to="/projects">All projects</Link>
        </p>

        <p className="small muted">
          UMass web ring: <a id="umaring_prev">previous</a>
          {" | "}
          <a id="umaring_next">next</a>
        </p>
      </section>
    </>
  );
};

export default Home;
