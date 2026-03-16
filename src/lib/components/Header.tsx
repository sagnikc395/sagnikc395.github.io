import React from "react";
import { Link, useLocation } from "react-router-dom";

const links = [
  { name: "projects", href: "/projects" },
  { name: "resume", href: "/resume" },
  { name: "blog", href: "/blog" },
];

const Header: React.FC = () => {
  const location = useLocation();
  const activeLink = links.find((link) => link.href === location.pathname);
  const pageTitle = activeLink
    ? activeLink.name.charAt(0).toUpperCase() + activeLink.name.slice(1)
    : null;

  return (
    <header className="layout-md flex justify-between items-baseline gap-x-8 mb-12">
      <h1 className="font-bold text-stone-900 dark:text-stone-100 text-2xl">
        <Link to="/">Sagnik Chatterjee</Link>
        {pageTitle && (
          <span className="font-light max-[580px]:block max-[580px]:text-xl">
            <span className="text-stone-400 dark:text-stone-600 max-[580px]:hidden">
              {" "}
              -{" "}
            </span>
            {pageTitle}
          </span>
        )}
      </h1>
      <nav className="flex items-center text-stone-500 dark:text-stone-400 justify-end space-x-6 text-lg py-0.5 max-[420px]:flex-col max-[420px]:items-end max-[420px]:space-x-0 max-[420px]:space-y-2 flex-shrink-0">
        {links.map((link) => (
          <Link
            key={link.href}
            to={link.href}
            className={`hover:text-stone-900 dark:hover:text-stone-100 transition-colors ${
              location.pathname === link.href
                ? "text-stone-900 dark:text-stone-100"
                : ""
            }`}
          >
            {link.name}
          </Link>
        ))}
      </nav>
    </header>
  );
};

export default Header;
