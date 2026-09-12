import React from "react";
import { Link } from "react-router-dom";
import Seo from "../lib/components/Seo";
import { formatTime } from "../lib/utils";

const posts = import.meta.glob("../posts/*.md", {
  eager: true,
  query: "?meta",
}) as Record<string, any>;

const Blog: React.FC = () => {
  const sortedPosts = Object.entries(posts)
    .map(([path, post]) => ({
      slug: path.split("/").pop()?.replace(".md", ""),
      ...(post.default || post),
    }))
    .filter((post) => !post.draft)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <>
      <Seo
        title="Sagnik Chatterjee - Blog"
        description="My thoughts and writings"
      />

      <section className="wrap">
        <h2>Writing</h2>

        <ul className="entries">
          {sortedPosts.map((post) => {
            const body = post.description || post.excerpt;
            return (
              <li key={post.slug}>
                <Link to={`/blog/${post.slug}`} className="entry-title">
                  {post.title}
                </Link>
                <br />
                <span className="entry-meta small">
                  {formatTime("%d %B %Y", post.date)}
                </span>
                {body && <p className="entry-note">{body}</p>}
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
};

export default Blog;
