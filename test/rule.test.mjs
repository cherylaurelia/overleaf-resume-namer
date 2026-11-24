import { test } from "node:test";
import assert from "node:assert/strict";
import { targetName, cleanName } from "../extension/rule.js";

const S = { fileName: "Resume_CherylAurelia", onlyResumes: true };
const ol = (filename, extra = {}) => ({ url: "https://www.overleaf.com/download/project/abc/build/1/output/output.pdf", filename, ...extra });

test("renames an Overleaf resume PDF", () => assert.equal(targetName(ol("/Users/x/Downloads/resume.pdf"), S), "Resume_CherylAurelia.pdf"));
test("matches CV and accents", () => {
  assert.equal(targetName(ol("My CV.pdf"), S), "Resume_CherylAurelia.pdf");
  assert.equal(targetName(ol("Résumé 2026.pdf"), S), "Resume_CherylAurelia.pdf");
});
test("ignores other Overleaf PDFs when onlyResumes is on", () => assert.equal(targetName(ol("thesis.pdf"), S), null));
test("renames any Overleaf PDF when onlyResumes is off", () => assert.equal(targetName(ol("thesis.pdf"), { ...S, onlyResumes: false }), "Resume_CherylAurelia.pdf"));
test("ignores other sites, even look-alikes", () => {
  assert.equal(targetName({ url: "https://example.com/resume.pdf", filename: "resume.pdf" }, S), null);
  assert.equal(targetName({ url: "https://overleaf.com.evil.io/resume.pdf", filename: "resume.pdf" }, S), null);
});
test("uses the referrer or redirected URL", () => {
  assert.equal(targetName({ url: "https://cdn.example/x", referrer: "https://www.overleaf.com/project/1", filename: "resume.pdf" }, S), "Resume_CherylAurelia.pdf");
  assert.equal(targetName({ url: "https://a.b/x", finalUrl: "https://compiles.overleaf.com/x.pdf", filename: "resume.pdf" }, S), "Resume_CherylAurelia.pdf");
});
test("ignores non-PDF downloads", () => assert.equal(targetName(ol("resume.zip"), S), null));
test("does nothing until a name is set", () => assert.equal(targetName(ol("resume.pdf"), { fileName: "", onlyResumes: true }), null));
test("cleans the name", () => {
  assert.equal(cleanName(" Resume:Jane/Doe.pdf "), "ResumeJaneDoe");
  assert.equal(targetName(ol("resume.pdf"), { fileName: "a/b.pdf", onlyResumes: true }), "ab.pdf");
});
