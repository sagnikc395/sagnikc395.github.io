/**
 * Static preview that behaves like GitHub Pages: directory paths resolve to
 * their index.html, `/foo` redirects to `/foo/`, and unknown paths get 404.html.
 * `vite preview` instead applies an SPA fallback, which serves the home page for
 * every route and hides prerendering bugs.
 */
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";

const root = path.resolve("dist");
const port = Number(process.argv[2] ?? 4173);

const types: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".xml": "application/xml",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
  ".ico": "image/x-icon",
};

async function statFile(p: string) {
  try {
    const s = await fs.stat(p);
    return s.isFile() ? s : null;
  } catch {
    return null;
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  const pathname = decodeURIComponent(url.pathname);

  // Reject traversal outright.
  const target = path.join(root, pathname);
  if (!target.startsWith(root)) {
    res.writeHead(403).end("Forbidden");
    return;
  }

  let file = await statFile(target);
  let filePath = target;

  if (!file && !pathname.endsWith("/")) {
    // A directory requested without its trailing slash: redirect, as Pages does.
    try {
      if ((await fs.stat(target)).isDirectory()) {
        res.writeHead(301, { Location: `${pathname}/${url.search}` }).end();
        return;
      }
    } catch {
      // fall through to 404
    }
  }

  if (!file && pathname.endsWith("/")) {
    filePath = path.join(target, "index.html");
    file = await statFile(filePath);
  }

  if (!file) {
    const notFound = path.join(root, "404.html");
    const body = await fs
      .readFile(notFound)
      .catch(() => Buffer.from("Not found"));
    res.writeHead(404, { "Content-Type": types[".html"] }).end(body);
    return;
  }

  const body = await fs.readFile(filePath);
  res.writeHead(200, {
    "Content-Type": types[path.extname(filePath)] ?? "application/octet-stream",
    "Content-Length": body.length,
  });
  res.end(body);
});

server.listen(port, () => {
  console.log(`serving dist/ like GitHub Pages at http://localhost:${port}/`);
});
