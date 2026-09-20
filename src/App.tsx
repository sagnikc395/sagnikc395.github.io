import React from "react";
import { Routes, Route } from "react-router-dom";
import Header from "./lib/components/Header";
import Footer from "./lib/components/Footer";
import Home from "./pages/Home";
import Projects from "./pages/Projects";
import ProjectPage from "./pages/ProjectPage";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import ReadingList from "./pages/ReadingList";
import Notes from "./pages/Notes";
import NotePage from "./pages/NotePage";

// The page components are a few KB in total, so they ride in the main bundle.
// The heavy part, rendered Markdown, stays code-split via src/lib/content.ts.
const App: React.FC = () => {
  return (
    <>
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/project/:slug" element={<ProjectPage />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/reading-list" element={<ReadingList />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/notes/:slug" element={<NotePage />} />
          <Route
            path="*"
            element={
              <div className="wrap">
                <h2>404: page not found</h2>
              </div>
            }
          />
        </Routes>
      </main>
      <Footer />
    </>
  );
};

export default App;
