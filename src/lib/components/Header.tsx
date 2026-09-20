import React from "react";
import { Link, useLocation } from "react-router-dom";
import SearchPalette from "./SearchPalette";
import ThemeToggle from "./ThemeToggle";

const links = [
  { name: "Projects", href: "/projects" },
  { name: "Blog", href: "/blog" },
  { name: "Reading", href: "/reading-list" },
];

const external = [
  { name: "Resume", href: "/assets/pdf/SagnikChatterjee-Resume.pdf" },
];

const Header: React.FC = () => {
  const { pathname } = useLocation();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="wrap site-header">
      <h1>
        <Link to="/">Sagnik Chatterjee</Link>
      </h1>

      <nav className="site-nav">
        {links.map((link, index) => (
          <React.Fragment key={link.href}>
            {index > 0 && (
              <span className="sep" aria-hidden="true">
                |
              </span>
            )}
            <Link
              to={link.href}
              aria-current={isActive(link.href) ? "page" : undefined}
            >
              {link.name}
            </Link>
          </React.Fragment>
        ))}
        {external.map((link) => (
          <React.Fragment key={link.href}>
            <span className="sep" aria-hidden="true">
              |
            </span>
            <a href={link.href} rel="external">
              {link.name}
            </a>
          </React.Fragment>
        ))}
        <span className="sep" aria-hidden="true">
          |
        </span>
        <SearchPalette />
        <span className="sep" aria-hidden="true">
          |
        </span>
        <ThemeToggle />
      </nav>
    </header>
  );
};

export default Header;
