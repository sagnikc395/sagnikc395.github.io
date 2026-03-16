import React from "react";

interface MarkdownProps {
  source: string;
}

const Markdown: React.FC<MarkdownProps> = ({ source }) => {
  return (
    <div className="md-output" dangerouslySetInnerHTML={{ __html: source }} />
  );
};

export default Markdown;
