import React, { useEffect, useReducer, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Seo from "../lib/components/Seo";
import ProjectDetail from "../lib/components/ProjectDetail";
import Utterances from "../lib/components/Utterances";
import { loadContent, peekContent } from "../lib/content";
import type { Project } from "../lib/types";

// The link previews carry the annotation table with them, so they load as their
// own chunk once the article is on screen rather than in the main bundle.
const LinkPopups = React.lazy(() => import("../lib/components/LinkPopups"));

const images = import.meta.glob("../projects/*.{png,jpg,svg}", {
  eager: true,
}) as Record<string, { default: string }>;

const ProjectPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const article = useRef<HTMLElement>(null);

  const project = slug ? peekContent<Project>("project", slug) : null;

  useEffect(() => {
    if (!slug || project !== undefined) return;
    let active = true;
    void loadContent<Project>("project", slug).then(() => {
      if (active) rerender();
    });
    return () => {
      active = false;
    };
  }, [slug, project]);

  useEffect(() => {
    if (project === null) navigate("/404", { replace: true });
  }, [project, navigate]);

  if (!project) return null;

  return (
    <>
      <Seo
        title={`Sagnik Chatterjee - ${project.title}`}
        description={project.title}
      />

      <section className="wrap" ref={article}>
        <p>
          <Link to="/projects">&larr; Back to projects</Link>
        </p>

        <ProjectDetail
          data={project}
          images={images}
          imagePrefix="../projects/"
        />

        <Utterances />

        <React.Suspense fallback={null}>
          <LinkPopups containerRef={article} />
        </React.Suspense>
      </section>
    </>
  );
};

export default ProjectPage;
