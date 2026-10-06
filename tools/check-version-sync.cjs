#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function extract(pattern, source, label, errors) {
  const match = source.match(pattern);
  if (!match) {
    errors.push("No se pudo leer " + label + ".");
    return null;
  }
  return match[1];
}

const errors = [];
const metadata = JSON.parse(read("version.json"));
const packageJson = JSON.parse(read("package.json"));
const html = read("index.html");
const readme = read("README.md");
const versionJs = read("version.js");
const changelog = read("CHANGELOG.md");
const serviceWorker = read("sw.js");

const version = metadata.version;
const numericVersion = String(version || "").replace(/^v/, "");
if (!/^\d+\.\d+\.\d+$/.test(numericVersion)) {
  errors.push("Formato de versión no válido en version.json: " + version);
}

const badgeVersion = extract(
  /<span class="version-badge__version">([^<]+)<\/span>/,
  html,
  "el badge de index.html",
  errors
);
const readmeVersion = extract(
  /^- Versión visible: \x60([^\x60]+)\x60$/m,
  readme,
  "la versión del README",
  errors
);
const fallbackBlock = extract(
  /const fallback = \{([\s\S]*?)\n  \};/,
  versionJs,
  "el fallback de version.js",
  errors
);
const fallbackVersion = fallbackBlock
  ? extract(/\bversion:\s*["']([^"']+)["']/, fallbackBlock, "la versión del fallback", errors)
  : null;
const fallbackTrack = fallbackBlock
  ? extract(/\btrack:\s*["']([^"']+)["']/, fallbackBlock, "el track del fallback", errors)
  : null;
const fallbackLabel = fallbackBlock
  ? extract(/\blabel:\s*["']([^"']+)["']/, fallbackBlock, "la etiqueta del fallback", errors)
  : null;
const fallbackUpdated = fallbackBlock
  ? extract(/\bupdated:\s*["']([^"']+)["']/, fallbackBlock, "la fecha del fallback", errors)
  : null;
const summaryBody = fallbackBlock
  ? extract(/\bsummary:\s*\[([\s\S]*?)\],/, fallbackBlock, "el resumen del fallback", errors)
  : null;
let fallbackSummary = null;
if (summaryBody !== null) {
  try {
    fallbackSummary = JSON.parse("[" + summaryBody.replace(/,\s*$/, "") + "]");
  } catch {
    errors.push("El resumen del fallback de version.js no es JSON válido.");
  }
}
const changelogVersion = extract(
  /^## (v\d+\.\d+\.\d+)$/m,
  changelog,
  "la versión más reciente del changelog",
  errors
);
const cacheName = extract(
  /const CACHE_NAME = "(lol-team-analyzer-v\d+)";/,
  serviceWorker,
  "la versión de caché de sw.js",
  errors
);

if (packageJson.version !== numericVersion) {
  errors.push("package.json tiene " + packageJson.version + "; se esperaba " + numericVersion + ".");
}
for (const [label, value] of [
  ["badge", badgeVersion],
  ["README", readmeVersion],
  ["fallback version.js", fallbackVersion],
  ["CHANGELOG", changelogVersion],
]) {
  if (value !== version) errors.push(label + " tiene " + value + "; se esperaba " + version + ".");
}
if (metadata.track !== fallbackTrack) errors.push("El track no coincide entre version.json y version.js.");
if (metadata.label !== fallbackLabel) errors.push("La etiqueta no coincide entre version.json y version.js.");
if (metadata.updated !== fallbackUpdated) errors.push("La fecha no coincide entre version.json y version.js.");
if (JSON.stringify(metadata.summary) !== JSON.stringify(fallbackSummary)) {
  errors.push("El resumen no coincide entre version.json y version.js.");
}
if (!cacheName) errors.push("La caché del service worker no tiene el formato esperado.");

if (errors.length) {
  console.error("La metadata de versión no está sincronizada:");
  for (const error of errors) console.error("- " + error);
  process.exitCode = 1;
} else {
  console.log("Metadata sincronizada: " + version + "; caché " + cacheName + ".");
}
