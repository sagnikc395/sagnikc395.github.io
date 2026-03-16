import React from "react";

interface WorkplaceProps {
  title: string;
  company: string;
  url: string;
  dates: string;
  location: string;
  children?: React.ReactNode;
}

const Workplace: React.FC<WorkplaceProps> = ({
  title,
  company,
  url,
  dates,
  location,
  children,
}) => {
  return (
    <div className="mb-6 last:mb-0">
      <div className="flex justify-between items-start flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="text-blue-500 hover:text-blue-400 transition-colors"
          >
            {company}
          </a>
        </div>
        <div className="text-right">
          <p className="text-stone-400 text-sm">{dates}</p>
          <p className="text-stone-500 text-xs">{location}</p>
        </div>
      </div>
      {children}
    </div>
  );
};

export default Workplace;
