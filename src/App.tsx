import React from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AnimatePresence, motion } from "framer-motion";
import Header from "./lib/components/Header";
import Footer from "./lib/components/Footer";
import Home from "./pages/Home";
import Projects from "./pages/Projects";
import ProjectPage from "./pages/ProjectPage";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import Resume from "./pages/Resume";

const PageWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isMobile = /Android|iPhone/i.test(navigator.userAgent);
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  if (isMobile || reducedMotion) {
    return <main>{children}</main>;
  }

  return (
    <motion.main
      initial={{ x: -10, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ y: 5, opacity: 0 }}
      transition={{ duration: 0.35, delay: 0.35 }}
    >
      {children}
    </motion.main>
  );
};

const App: React.FC = () => {
  const location = useLocation();

  return (
    <HelmetProvider>
      <div className="min-h-screen flex flex-col">
        <Header />
        <AnimatePresence mode="wait">
          <PageWrapper key={location.pathname}>
            <Routes location={location}>
              <Route path="/" element={<Home />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/project/:slug" element={<ProjectPage />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:slug" element={<BlogPost />} />
              <Route path="/resume" element={<Resume />} />
              <Route
                path="*"
                element={
                  <div className="layout-md py-20 text-center">
                    404 - Page Not Found
                  </div>
                }
              />
            </Routes>
          </PageWrapper>
        </AnimatePresence>
        <Footer />
      </div>
    </HelmetProvider>
  );
};

export default App;
