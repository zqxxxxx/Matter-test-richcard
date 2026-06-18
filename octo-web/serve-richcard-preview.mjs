import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "apps/web/build");
const port = Number(process.env.PORT || 3101);
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".mp3": "audio/mpeg",
};

function send(res, status, body, type = "text/plain; charset=utf-8") {
  res.writeHead(status, {
    "content-type": type,
    "cache-control": "no-cache",
  });
  res.end(body);
}

function resolveAsset(urlPath) {
  const decoded = decodeURIComponent(urlPath);
  const normalized = decoded === "/" ? "/index.html" : decoded;
  const filePath = path.normalize(path.join(root, normalized));
  return filePath.startsWith(root) ? filePath : null;
}

http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const filePath = resolveAsset(url.pathname);
  if (!filePath) return send(res, 403, "Forbidden");

  fs.stat(filePath, (err, stat) => {
    const target = err || !stat.isFile() ? path.join(root, "index.html") : filePath;
    fs.readFile(target, (readErr, data) => {
      if (readErr) return send(res, 404, "Not found");
      send(res, 200, data, types[path.extname(target)] || "application/octet-stream");
    });
  });
}).listen(port, "0.0.0.0", () => {
  console.log(`richcard preview server listening on ${port}`);
});
