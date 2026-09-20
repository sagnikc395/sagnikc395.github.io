import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom";
import App from "./App";
import { head } from "./lib/head";
import { preloadRoute, slugsOf } from "./lib/content";
import { peekContent } from "./lib/content";
import type { Note, Post } from "./lib/types";
import "./app.css";

export interface Rendered {
  html: string;
  title: string;
  description: string;
}

export async function render(url: string): Promise<Rendered> {
  await preloadRoute(url);
  head.title = "";
  head.description = "";
  const html = renderToString(
    <StaticRouter location={url}>
      <App />
    </StaticRouter>,
  );
  return { html, title: head.title, description: head.description };
}

/** Every URL the build should emit as a real HTML file. */
export async function routes(): Promise<string[]> {
  const list = ["/", "/blog", "/projects", "/reading-list", "/notes", "/404"];

  for (const slug of slugsOf("post")) {
    const url = `/blog/${slug}`;
    await preloadRoute(url);
    if (peekContent<Post>("post", slug)?.draft) continue;
    list.push(url);
  }

  for (const slug of slugsOf("project")) {
    list.push(`/project/${slug}`);
  }

  for (const slug of slugsOf("note")) {
    const url = `/notes/${slug}`;
    await preloadRoute(url);
    if (peekContent<Note>("note", slug)?.draft) continue;
    list.push(url);
  }

  return list;
}
