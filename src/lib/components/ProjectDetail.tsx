import React from "react";
import Markdown from "./Markdown";
import type { Project } from "../types";
import References from "./References";
import { formatTime, getImageUrl } from "../utils";

interface ProjectDetailProps {
  data: Project;
  images: Record<string, { default: string }>;
  imagePrefix?: string;
}

const ProjectDetail: React.FC<ProjectDetailProps> = ({
  data,
  images,
  imagePrefix = "../../projects/",
}) => {
  return (
    <>
      <h2>{data.title}</h2>
      {data.date && (
        <p className="entry-meta small">{formatTime("%d %B %Y", data.date)}</p>
      )}

      {data.image && (
        <p>
          <a rel="external" href={getImageUrl(data.image, imagePrefix, images)}>
            <img
              src={getImageUrl(data.image, imagePrefix, images)}
              alt={`${data.title} preview`}
              loading="lazy"
              decoding="async"
              width={640}
              height={360}
            />
          </a>
        </p>
      )}

      <Markdown source={data.content} />

      {data.subimages?.map((image, index) => (
        <p key={index}>
          <a rel="external" href={getImageUrl(image, imagePrefix, images)}>
            <img
              src={getImageUrl(image, imagePrefix, images)}
              alt={`${data.title} figure ${index + 1}`}
              loading="lazy"
              decoding="async"
            />
          </a>
        </p>
      ))}

      <References references={data.references} />
    </>
  );
};

export default ProjectDetail;
