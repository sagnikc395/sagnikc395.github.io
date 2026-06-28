import React, { Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import Header from "./lib/components/Header";
import Footer from "./lib/components/Footer";
import Home from "./pages/Home";

const Projects = React.lazy(() => import("./pages/Projects"));
const ProjectPage = React.lazy(() => import("./pages/ProjectPage"));
const Blog = React.lazy(() => import("./pages/Blog"));
const BlogPost = React.lazy(() => import("./pages/BlogPost"));

const PageWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <main>{children}</main>;
};

const App: React.FC = () => {
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
