# Resume Namer for Overleaf

A Chrome extension that saves the resume PDF you download from Overleaf under one fixed name, such as `Resume_JaneDoe.pdf`, and replaces the previous copy.

Without it, every download lands as `resume (1).pdf`, `resume (2).pdf` and so on, and you rename files in Finder before every application.

## Install

**From source** (until it's on the Chrome Web Store):

1. Download this repository (Code → Download ZIP) and unzip it.
2. Open `chrome://extensions` and turn on **Developer mode** (top right).
3. Click **Load unpacked** and choose the `extension` folder.
4. In the settings page that opens, type the name you want, for example `Resume_JaneDoe`.

It works in Chrome, Edge, Brave, Arc and other Chromium browsers.

## How it works

When a PDF finishes downloading from `overleaf.com`, the extension renames it to your chosen name and overwrites the old file with that name in your downloads folder. Old versions stay in Overleaf's history.

By default, it only renames projects with "resume", "résumé" or "CV" in the file name, so your other Overleaf PDFs keep their names. Untick the setting to rename every Overleaf PDF.

Nothing leaves your browser. The extension stores one setting (your file name) and needs two permissions: `downloads` to pick the file name and `storage` to remember it.

## Development

```sh
npm test                       # unit tests for the naming rule
npm run e2e -- <chromium path> # loads the extension in Chromium and downloads real files
npm run zip                    # builds resume-namer.zip for the Chrome Web Store
```

The end-to-end test needs a Chromium build that allows `--load-extension`, such as Chrome for Testing (`npx @puppeteer/browsers install chrome@stable`). Branded Google Chrome ignores that flag.
