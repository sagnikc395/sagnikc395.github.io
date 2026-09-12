import React, { useEffect, useReducer } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Seo from "../lib/components/Seo";
import Markdown from "../lib/components/Markdown";
import Utterances from "../lib/components/Utterances";
import References from "../lib/components/References";
import { loadContent, peekContent } from "../lib/content";
import type { Post } from "../lib/types";
import { formatTime } from "../lib/utils";

const BlogPost: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [, rerender] = useReducer((n: number) => n + 1, 0);

  // Already in the cache on the prerendered/hydrated route, so this first render
  // matches the server. Only client-side navigation hits the async path below.
  const post = slug ? peekContent<Post>("post", slug) : null;

  useEffect(() => {
    if (!slug || post !== undefined) return;
    let active = true;
    void loadContent<Post>("post", slug).then(() => {
      if (active) rerender();
    });
    return () => {
      active = false;
    };
  }, [slug, post]);

  useEffect(() => {
    if (post === null || post?.draft) navigate("/404", { replace: true });
  }, [post, navigate]);

  if (!post || post.draft) return null;

  return (
    <>
      <Seo title={post.title} description={`Blog post: ${post.title}`} />

      <article className="wrap">
        <h2>{post.title}</h2>
        <p className="entry-meta small">{formatTime("%d %B %Y", post.date)}</p>

        {post.image && <img src={post.image} alt={post.title} />}

        <Markdown source={post.content} />

        <References references={post.references} />

        <Utterances />
      </article>
    </>
  );
};

export default BlogPost;
