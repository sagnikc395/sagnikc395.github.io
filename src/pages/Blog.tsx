import React from "react";
import { Link } from "react-router-dom";
import Seo from "../lib/components/Seo";
import { formatTime } from "../lib/utils";

const posts = import.meta.glob("../posts/*.md", {
  eager: true,
}) as Record<string, any>;

const Blog: React.FC = () => {
  const sortedPosts = Object.entries(posts)
    .map(([path, post]) => {
      const slug = path.split("/").pop()?.replace(".md", "");
      return {
        slug,
        ...(post.default || post),
      };
    })
    .filter((post) => !post.draft)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <>
      <Seo
        title="Sagnik Chatterjee - Blog"
        description="My thoughts and writings"
      />

      <section className="layout-md">
        <h1 className="text-2xl font-bold mb-6 text-stone-100">Blog</h1>
        <p className="text-sm md:text-lg mb-4 text-stone-400">
          <em>writings and thoughts</em>
        </p>

        <hr className="mb-8 border-stone-800" />

        <div className="flex flex-col gap-8">
          {sortedPosts.map((post) => (
            <article key={post.slug} className="flex flex-col gap-2">
              <Link
                to={`/blog/${post.slug}`}
                className="text-xl font-semibold text-stone-100 hover:text-blue-400 transition-colors"
              >
                {post.title}
              </Link>
              <span className="text-stone-500 text-sm">
                {formatTime("%d %B %Y", post.date)}
              </span>
              {post.description && (
                <p className="text-stone-400">{post.description}</p>
              )}
            </article>
          ))}
        </div>
      </section>
    </>
  );
};

export default Blog;
