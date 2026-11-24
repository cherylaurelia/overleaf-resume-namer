import { DEFAULTS, cleanName } from "./rule.js";

const fileName = document.getElementById("fileName");
const onlyResumes = document.getElementById("onlyResumes");
const status = document.getElementById("status");

chrome.storage.sync.get(DEFAULTS).then((s) => {
  fileName.value = s.fileName;
  onlyResumes.checked = s.onlyResumes;
});

async function save() {
  const name = cleanName(fileName.value);
  await chrome.storage.sync.set({ fileName: name, onlyResumes: onlyResumes.checked });
  status.textContent = name ? `Saved: downloads go to ${name}.pdf` : "Enter a file name to turn it on.";
}
fileName.addEventListener("input", save);
onlyResumes.addEventListener("change", save);
