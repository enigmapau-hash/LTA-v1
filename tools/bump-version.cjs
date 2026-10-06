#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const [releaseType, ...noteParts] = process.argv.slice(2);
const note = noteParts.join(" ").trim();

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!["patch", "minor", "major"].includes(releaseType) || !note) {
  fail('Uso: npm run version:bump -- <patch|minor|major> "Resumen del cambio"');
}

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const metadata = JSON.parse(readText("version.json"));
const match = String(metadata.version || "").match(/^v?(\d+)\.(\d+)\.(\d+)$/);
if (!match) fail(`Versión no válida en version.json: ${metadata.version}`);

let [major, minor, patch] = match.slice(1).map(Number);
if (releaseType === "major") {
  major += 1;
  minor = 0;
  patch = 0;
} else if (releaseType === "minor") {
  minor += 1;
  patch = 0;
} else {
  patch += 1;
}

const numericVersion = `${major}.${minor}.${patch}`;
const version = `v${numericVersion}`;
const date = new Date().toISOString().slice(0, 10);
const packageJson = JSON.parse(readText("package.json"));
let html = readText("index.html");
let versionJs = readText("version.js");
let serviceWorker = readText("sw.js");
let changelog = readText("CHANGELOG.md");
let readme = readText("README.md");

const badgePattern = /(<span class="version-badge__version">)[^<]*(<\/span>)/;
if (!badgePattern.test(html)) fail("No se encontró el badge de versión en index.html");
const readmePattern = /(- Versión visible: `)[^\`]+(`)/;
if (!readmePattern.test(readme)) fail("No se encontró la versión visible en README.md");

const cacheMatch = serviceWorker.match(/const CACHE_NAME = "lol-team-analyzer-v(\d+)";/);
if (!cacheMatch) fail("No se encontró la versión de caché en sw.js");
const nextCacheVersion = Number(cacheMatch[1]) + 1;
serviceWorker = serviceWorker.replace(
  cacheMatch[0],
  `const CACHE_NAME = "lol-team-analyzer-v${nextCacheVersion}";`
);

const fallbackFields = [
  [/version:\s*["'][^"']*["']/, `version: "${version}"`],
  [/track:\s*["'][^"']*["']/, 'track: "Actualización funcional"'],
  [/label:\s*["'][^"']*["']/, `label: ${JSON.stringify(metadata.label || "Preview")}`],
  [/updated:\s*["'][^"']*["']/, `updated: "${date}"`],
  [/summary:\s*\[[\s\S]*?\],/, `summary: [${JSON.stringify(note)}],`],
];
for (const [pattern] of fallbackFields) {
  if (!pattern.test(versionJs)) fail("No se pudo sincronizar el fallback de version.js");
}
for (const [pattern, replacement] of fallbackFields) {
  versionJs = versionJs.replace(pattern, replacement);
}

if (!changelog.startsWith("# Changelog")) fail("No se encontró el encabezado de CHANGELOG.md");
const category = releaseType === "major" ? "Breaking" : releaseType === "minor" ? "Added" : "Fixed";
const changelogEntry = `\n\n## ${version}\n\n### ${category}\n- ${note}\n`;
changelog = changelog.replace(/^# Changelog/, (header) => header + changelogEntry);

metadata.version = version;
metadata.track = "Actualización funcional";
metadata.updated = date;
metadata.summary = [note];
metadata.pending = [];

packageJson.version = numericVersion;
html = html.replace(badgePattern, `$1${version}$2`);
readme = readme.replace(readmePattern, `$1${version}$2`);

const files = new Map([
  ["version.json", JSON.stringify(metadata, null, 2) + "\n"],
  ["version.js", versionJs],
  ["sw.js", serviceWorker],
  ["index.html", html],
  ["package.json", JSON.stringify(packageJson, null, 2) + "\n"],
  ["CHANGELOG.md", changelog],
  ["README.md", readme],
]);

for (const [relativePath, contents] of files) {
  fs.writeFileSync(path.join(root, relativePath), contents, "utf8");
}

console.log(`Versión actualizada a ${version} (${releaseType}).`);
console.log("Incluye los cambios sincronizados en index.html, README.md, version.json, version.js, sw.js, package.json y CHANGELOG.md.");
