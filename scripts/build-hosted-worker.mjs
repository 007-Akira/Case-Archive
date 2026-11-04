// Serve the existing Vite build with explicit response headers on the private Sites host.
// Only public build artifacts are embedded. No environment files or backend credentials.
import fs from "node:fs";
import path from "node:path";
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".svg": "image/svg+xml",
};
const files = {};
function walk(dir) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    if (
      item.name.startsWith(".") ||
      ["server", "_headers", "_redirects"].includes(item.name)
    )
      continue;
    const file = path.join(dir, item.name);
    if (item.isDirectory()) walk(file);
    else if (item.isFile()) {
      const url = "/" + path.relative("dist", file).split(path.sep).join("/");
      files[url] = {
        body: fs.readFileSync(file).toString("base64"),
        type: types[path.extname(file)] ?? "application/octet-stream",
      };
    }
  }
}
walk("dist");
const headers = {};
for (const line of fs
  .readFileSync("public/_headers", "utf8")
  .split("\n")
  .slice(1)) {
  if (!line.trim()) break;
  const i = line.indexOf(":");
  headers[line.slice(0, i).trim()] = line.slice(i + 1).trim();
}
const code = `const assets=${JSON.stringify(files)};\nconst security=${JSON.stringify(headers)};\nexport default {async fetch(request){const url=new URL(request.url);const headers=new Headers(security);if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers});let key=url.pathname;if(key==='/')key='/index.html';if(!assets[key]&&!key.split('/').pop().includes('.'))key='/index.html';const asset=assets[key];if(!asset)return new Response('Not found',{status:404,headers});headers.set('Content-Type',asset.type);if(key.startsWith('/assets/'))headers.set('Cache-Control','public, max-age=31536000, immutable');const body=request.method==='HEAD'?null:Uint8Array.from(atob(asset.body),c=>c.charCodeAt(0));return new Response(body,{headers});}};\n`;
fs.mkdirSync("dist/server", { recursive: true });
fs.writeFileSync("dist/server/index.js", code);
fs.mkdirSync("dist/.openai", { recursive: true });
fs.copyFileSync(".openai/hosting.json", "dist/.openai/hosting.json");
console.log(
  `Hosted Worker generated for ${Object.keys(files).length} public assets.`,
);
