// Reuse the hardened public-asset Worker on the free pages.dev hostname.
import fs from "node:fs";

fs.rmSync(".pages-dist", { recursive: true, force: true });
fs.mkdirSync(".pages-dist");
fs.copyFileSync("dist/server/index.js", ".pages-dist/_worker.js");
fs.copyFileSync("dist/index.html", ".pages-dist/index.html");
console.log("Cloudflare Pages bundle prepared.");
