import { DEFAULTS, targetName } from "./rule.js";

chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
  chrome.storage.sync.get(DEFAULTS).then((settings) => {
    const name = targetName(item, settings);
    if (name) suggest({ filename: name, conflictAction: "overwrite" });
    else suggest();
  }, () => suggest());
  return true; // suggest is called asynchronously
});

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === "install") chrome.runtime.openOptionsPage();
});
