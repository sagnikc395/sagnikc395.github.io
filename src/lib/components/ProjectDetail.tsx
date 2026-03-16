import React from "react";
import Markdown from "./Markdown";
import type { Project } from "../types";
import { formatTime } from "../utils";

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
  function isURL(path: string): boolean {
    try {
      new URL(path);
      return true;
    } catch {
      return false;
    }
  }

  function getImageUrl(path: string) {
    if (isURL(path)) return path;
    return images[`${imagePrefix}${path}`]?.default;
  }

  return (
    <>
      {/* project header */}
      <h3 className="text-stone-100 text-xl md:text-2xl font-semibold mb-4 flex flex-wrap items-center break-words">
        {data.title && <span className="mr-2">{data.title}</span>}
        {data.date && (
          <small className="text-stone-400 text-base font-normal">
            {formatTime("%d %B %Y", data.date)}
          </small>
        )}
      </h3>

      {/* project body */}
      <div className="grid md:grid-cols-3 gap-6 items-start">
        {/* main image */}
        {data.image && (
          <div className="md:col-span-1">
            <a rel="external" href={getImageUrl(data.image)}>
              <img
                src={getImageUrl(data.image)}
                alt={`${data.title} preview image`}
                className="rounded-lg shadow-sm max-h-64 object-cover w-full"
              />
            </a>
          </div>
        )}

        {/* description */}
        <div className="md:col-span-2 prose prose-stone prose-invert prose-headings:font-semibold prose-a:text-blue-600 hover:prose-a:text-blue-800 max-w-none">
          <Markdown source={data.content} />
        </div>
      </div>

      {/* subimages */}
      {data.subimages && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
          {data.subimages.map((image, index) => (
            <a key={index} rel="external" href={getImageUrl(image)}>
              <img
                src={getImageUrl(image)}
                alt={`${data.title} subimage`}
                className="rounded-lg shadow-sm object-cover w-full max-h-48"
              />
            </a>
          ))}
        </div>
      )}
    </>
  );
};

export default ProjectDetail;
