import React from "react";

const Footer: React.FC = () => {
  return (
    <footer className="wrap site-footer">
      <p>
        <a href="mailto:sagnikchatte@umass.edu">sagnikchatte@umass.edu</a>
        {" · "}
        <a rel="external" href="https://github.com/sagnikc395">
          GitHub
        </a>
        {" · "}
        <a rel="external" href="https://www.linkedin.com/in/sagnikchatterjee3/">
          LinkedIn
        </a>
        {" · "}
        <a rel="external" href="https://scholar.google.com/citations?user=B6nGdVsAAAAJ&hl=en">
          Google Scholar
        </a>
      </p>
      <p className="muted">Last updated: September 2026.</p>
    </footer>
  );
};

export default Footer;
