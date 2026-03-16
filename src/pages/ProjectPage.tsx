import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Seo from "../lib/components/Seo";
import ProjectDetail from "../lib/components/ProjectDetail";

const images = import.meta.glob("../projects/*.{png,jpg,svg}", {
  eager: true,
}) as any;

const ProjectPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<any>(null);

  useEffect(() => {
    const loadProject = async () => {
      try {
        const projects = import.meta.glob("../projects/*.md");
        const path = `../projects/${slug}.md`;
        if (projects[path]) {
          const data: any = await projects[path]();
          setProject(data.default || data);
        } else {
          navigate("/404");
        }
      } catch (e) {
        console.error(e);
        navigate("/404");
      }
    };
    loadProject();
  }, [slug, navigate]);

  if (!project) return null;

  return (
    <>
      <Seo
        title={`Sagnik Chatterjee - ${project.title}`}
        description={project.title}
      />

      <section className="layout-md py-10">
        <Link
          to="/projects"
          className="text-stone-400 hover:text-stone-100 mb-8 inline-block"
        >
          &larr; Back to projects
        </Link>
        <ProjectDetail
          data={project}
          images={images}
          imagePrefix="../projects/"
        />
      </section>
    </>
  );
};

export default ProjectPage;
