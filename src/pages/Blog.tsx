import React, { useState } from "react";
import { Link } from "react-router-dom";
import Seo from "../lib/components/Seo";
import { formatTime } from "../lib/utils";

const posts = import.meta.glob("../posts/*.md", {
  eager: true,
  query: "?meta",
}) as Record<string, any>;

const Blog: React.FC = () => {
  const [preview, setPreview] = useState<string | null>(null);

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
          {sortedPosts.map((post) => {
            const body = post.description || post.excerpt;
            const open = preview === post.slug && Boolean(body);

            return (
              <article
                key={post.slug}
                className="flex flex-col gap-2"
                onMouseEnter={() => setPreview(post.slug)}
                onMouseLeave={() =>
                  setPreview((current) =>
                    current === post.slug ? null : current,
                  )
                }
              >
                <Link
                  to={`/blog/${post.slug}`}
                  className={`text-xl font-semibold transition-colors ${
                    open ? "text-blue-400" : "text-stone-100"
                  } hover:text-blue-400`}
                  onFocus={() => setPreview(post.slug)}
                  onBlur={() =>
                    setPreview((current) =>
                      current === post.slug ? null : current,
                    )
                  }
                >
                  {post.title}
                </Link>
                <span className="text-stone-500 text-sm">
                  {formatTime("%d %B %Y", post.date)}
                </span>

                {/* No hover on touch devices, so the excerpt just stays visible. */}
                {body && <p className="md:hidden text-stone-400">{body}</p>}

                {body && (
                  <div
                    className={`hidden md:grid transition-all duration-200 ease-out ${
                      open
                        ? "grid-rows-[1fr] opacity-100 mt-2"
                        : "grid-rows-[0fr] opacity-0"
                    }`}
                    aria-hidden={!open}
                  >
                    <div className="overflow-hidden">
                      <div className="rounded-lg border border-stone-800 bg-stone-900/40 p-6">
                        <h2 className="text-lg font-semibold text-stone-100">
                          {post.title}
                        </h2>
                        <div className="text-sm text-stone-500 mt-1">
                          {formatTime("%d %B %Y", post.date)}
                        </div>
                        <p className="mt-4 leading-7 text-stone-300">{body}</p>
                      </div>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
};

export default Blog;
