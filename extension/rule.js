// Decides the file name for a download. Pure, so it can be tested outside the browser.
export const DEFAULTS = { fileName: "", onlyResumes: true };

const OVERLEAF = /(^|\.)overleaf\.com$/i;
const RESUME_WORDS = /resume|résumé|cv|curriculum/i;

function host(url) {
  try { return new URL(url).hostname; } catch { return ""; }
}

// Characters that are not allowed in file names on Windows or macOS.
export function cleanName(name) {
  return name.trim().replace(/\.pdf$/i, "").replace(/[\\/:*?"<>|]/g, "").trim();
}

// item: { url, finalUrl, referrer, filename, mime }. Returns the new file name, or null to leave it alone.
export function targetName(item, settings) {
  const name = cleanName(settings.fileName || "");
  if (!name) return null;
  const fromOverleaf = [item.url, item.finalUrl, item.referrer].some((u) => OVERLEAF.test(host(u || "")));
  if (!fromOverleaf) return null;
  const base = (item.filename || "").split(/[\\/]/).pop();
  const isPdf = /\.pdf$/i.test(base) || item.mime === "application/pdf";
  if (!isPdf) return null;
  if (settings.onlyResumes && !RESUME_WORDS.test(base)) return null;
  return `${name}.pdf`;
}
