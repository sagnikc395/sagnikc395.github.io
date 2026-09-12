import React from "react";
import { hydrateRoot, createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { preloadRoute } from "./lib/content";
import "./app.css";

const container = document.getElementById("root")!;

const tree = (
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

// Resolve this route's Markdown chunk before hydrating so the first client
// render produces the same tree the build already wrote into the HTML.
void preloadRoute(window.location.pathname).then(() => {
  if (container.firstChild) {
    hydrateRoot(container, tree);
  } else {
    createRoot(container).render(tree);
  }
});
