import React from "react";
import { Link } from "react-router-dom";
import Seo from "../lib/components/Seo";
import { formatTime } from "../lib/utils";

const projects = import.meta.glob("../projects/*.md", {
  eager: true,
  query: "?meta",
}) as Record<string, any>;

function getSlug(id: string) {
  return id.match(/\.\.\/projects\/(.*)\.md$/)?.[1];
}

const Projects: React.FC = () => {
  const sortedProjectIds = Object.keys(projects).sort((a, b) => {
    const projA = projects[a].default || projects[a];
    const projB = projects[b].default || projects[b];
    return new Date(projB.date).getTime() - new Date(projA.date).getTime();
  });

  return (
    <>
      <Seo
        title="Sagnik Chatterjee - Projects"
        description="my side projects"
      />

      <section className="wrap">
        <h2>Projects</h2>
        <p className="muted">An index of some of my open source work.</p>

        <ul className="entries">
          {sortedProjectIds.map((id) => {
            const project = projects[id].default || projects[id];
            const slug = getSlug(id);
            return (
              <li key={id}>
                <Link to={`/project/${slug}`} className="entry-title">
                  {project.title}
                </Link>
                {project.date && (
                  <span className="entry-meta">
                    {" "}
                    · {formatTime("%Y", project.date)}
                  </span>
                )}
                {project.lead && <p className="entry-note">{project.lead}</p>}
                {project.topics?.length > 0 && (
                  <p className="entry-meta small">
                    {project.topics.join(", ")}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
};

export default Projects;
