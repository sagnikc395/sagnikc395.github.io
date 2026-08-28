import React, { Suspense, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import Header from "./lib/components/Header";
import Footer from "./lib/components/Footer";
import Home from "./pages/Home";
import { runWhenIdle } from "./lib/idle";

const Projects = React.lazy(() => import("./pages/Projects"));
const ProjectPage = React.lazy(() => import("./pages/ProjectPage"));
const Blog = React.lazy(() => import("./pages/Blog"));
const BlogPost = React.lazy(() => import("./pages/BlogPost"));
const ReadingList = React.lazy(() => import("./pages/ReadingList"));

// SvelteKit-like prefetch: warm up route chunks on idle so navigation is instant
function usePrefetchRoutes() {
  useEffect(() => {
    const handle = runWhenIdle(() => {
      void import("./pages/Blog");
      void import("./pages/Projects");
      void import("./pages/ReadingList");
    });
    return () => {
      // idle handle cleanup via runWhenIdle's cancel not needed here (no cancelIdleRun import to avoid cycle)
      // prefetch is best-effort; no cleanup
      void handle;
    };
  }, []);
}

const PageWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <main>{children}</main>;
};

const App: React.FC = () => {
  usePrefetchRoutes();
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <PageWrapper>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/project/:slug" element={<ProjectPage />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route path="/reading-list" element={<ReadingList />} />
            <Route
              path="*"
              element={
                <div className="layout-md py-20 text-center">
                  404 - Page Not Found
                </div>
              }
            />
          </Routes>
        </Suspense>
      </PageWrapper>
      <Footer />
    </div>
  );
};

export default App;
