// End to end: real Chromium with the extension loaded, real downloads from a host named
// www.overleaf.com (mapped to a local server). Usage: node test/e2e.mjs <chromium binary>
import https from "node:https";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const CHROME = process.argv[2];
if (!CHROME || !fs.existsSync(CHROME)) { console.error("usage: node test/e2e.mjs <chromium binary>"); process.exit(2); }
const EXT = path.resolve("extension");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "rn-e2e-"));
const DL = path.join(tmp, "downloads"), PROFILE = path.join(tmp, "profile");
fs.mkdirSync(DL); fs.mkdirSync(path.join(PROFILE, "Default"), { recursive: true });
fs.writeFileSync(path.join(PROFILE, "Default", "Preferences"),
  JSON.stringify({ download: { default_directory: DL, prompt_for_download: false } }));
fs.writeFileSync(path.join(DL, "Resume_Test.pdf"), "old version");

// local HTTPS (Chromium blocks plain-http downloads); self-signed cert, accepted with --ignore-certificate-errors
execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "1", "-subj", "/CN=test",
  "-keyout", path.join(tmp, "k.pem"), "-out", path.join(tmp, "c.pem")], { stdio: "ignore" });
const server = https.createServer({ key: fs.readFileSync(path.join(tmp, "k.pem")), cert: fs.readFileSync(path.join(tmp, "c.pem")) }, (req, res) => {
  const name = path.basename(new URL(req.url, "http://x").pathname);
  res.writeHead(200, { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${name}"` });
  res.end(`%PDF-1.4 ${name} ${req.headers.host}`);
}).listen(0);
const PORT = server.address().port;

const chrome = spawn(CHROME, [
  "--headless=new", `--user-data-dir=${PROFILE}`, "--remote-debugging-port=0", "--no-first-run", "--ignore-certificate-errors",
  ...(process.env.NOEXT ? [] : [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`]),
  `--host-resolver-rules=MAP www.overleaf.com 127.0.0.1:${PORT}, MAP example.com 127.0.0.1:${PORT}`,
  "about:blank"], { stdio: ["ignore", "ignore", "pipe"] });
const wsUrl = await new Promise((ok, bad) => {
  let buf = ""; chrome.stderr.on("data", (d) => { buf += d; const m = buf.match(/ws:\/\/\S+/); if (m) ok(m[0]); });
  setTimeout(() => bad(new Error("chromium did not start")), 15000);
});

const ws = new WebSocket(wsUrl); let id = 0; const waiting = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (process.env.DEBUG && m.method && /download/i.test(m.method)) console.log("event", m.method, JSON.stringify(m.params).slice(0,200)); if (waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id); } };
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
const send = (method, params = {}, sessionId) => new Promise((r) => { const i = ++id; waiting.set(i, r); ws.send(JSON.stringify({ id: i, method, params, sessionId })); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// find the extension's service worker and set the user's file name, as the options page would
// Chromium has built-in extensions with their own background.js: pick the one with the downloads API
let sw;
for (let i = 0; i < 50 && !sw && !process.env.NOEXT; i++) {
  const { result } = await send("Target.getTargets");
  for (const t of result.targetInfos.filter((t) => t.type === "service_worker" && t.url.endsWith("/background.js"))) {
    const { result: { sessionId: s } } = await send("Target.attachToTarget", { targetId: t.targetId, flatten: true });
    const r = await send("Runtime.evaluate", { expression: "!!(globalThis.chrome && chrome.downloads)", returnByValue: true }, s);
    if (r.result?.result?.value) { sw = t; break; }
  }
  if (!sw) await sleep(200);
}
if (!sw && !process.env.NOEXT) throw new Error("extension service worker not found");
// set the name the way a user does: type it on the extension's settings page
if (sw) {
  const opts = sw.url.replace(/background\.js$/, "options.html");
  const { result: { targetId: ot } } = await send("Target.createTarget", { url: opts });
  const { result: { sessionId: os_ } } = await send("Target.attachToTarget", { targetId: ot, flatten: true });
  await sleep(800);
  await send("Runtime.evaluate", { expression: 'const f = document.getElementById("fileName"); f.value = "  Resume_Test.pdf "; f.dispatchEvent(new Event("input"));', awaitPromise: true }, os_);
  await sleep(500);
  const st = await send("Runtime.evaluate", { expression: 'document.getElementById("status").textContent', returnByValue: true }, os_);
  console.log("settings page says:", st.result?.result?.value);
}

const { result: { targetId } } = await send("Target.createTarget", { url: "about:blank" });
const { result: { sessionId } } = await send("Target.attachToTarget", { targetId, flatten: true });
async function download(url) {
  const r = await send("Page.navigate", { url }, sessionId);
  if (process.env.DEBUG) console.log("navigate", url, JSON.stringify(r.result || r.error));
  await sleep(2500);
}
await download(`https://www.overleaf.com/download/project/1/output/resume.pdf`);
await download(`https://www.overleaf.com/download/project/2/output/thesis.pdf`);
await download(`https://example.com/files/resume.pdf`);

if (process.env.DEBUG && sw) {
  const { result: { sessionId: s2 } } = await send("Target.attachToTarget", { targetId: sw.targetId, flatten: true });
  const r = await send("Runtime.evaluate", { expression: 'JSON.stringify({href: location.href, keys: typeof chrome === "object" ? Object.keys(chrome) : typeof chrome})', awaitPromise: true, returnByValue: true }, s2);
  console.log("sw state", JSON.stringify(r.result?.result?.value || r.result || r.error));
}
const files = fs.readdirSync(DL).sort();
const read = (f) => fs.readFileSync(path.join(DL, f), "utf8");
const checks = [
  ["Overleaf resume saved under the chosen name", files.includes("Resume_Test.pdf") && read("Resume_Test.pdf").includes("resume.pdf www.overleaf.com")],
  ["old copy replaced, no numbered duplicate", !files.some((f) => /Resume_Test.*\(\d\)|Resume_Test \(/.test(f))],
  ["other Overleaf PDF left alone", files.includes("thesis.pdf")],
  ["PDF from another site left alone", files.includes("resume.pdf") && read("resume.pdf").includes("example.com")],
];
console.log("files:", files.join(", "));
let fail = 0;
for (const [name, ok] of checks) { console.log(ok ? "PASS" : "FAIL", name); if (!ok) fail++; }
ws.close(); chrome.kill(); server.close();
process.exit(fail ? 1 : 0);
