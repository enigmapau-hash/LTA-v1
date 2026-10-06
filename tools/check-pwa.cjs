#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
const serviceWorker = fs.readFileSync(path.join(root, "sw.js"), "utf8");
const legacyWorker = fs.readFileSync(path.join(__dirname, "fixtures", "sw-v12.js"), "utf8");
const cacheName = serviceWorker.match(/const CACHE_NAME = "([^"]+)";/)?.[1];
const previousCacheName = "lol-team-analyzer-v12";
const xlsxUrl = "/vendor/xlsx.full.min.js";

function validateInstallMetadata() {
  assert.equal(manifest.name, "LoL Team Analyzer");
  assert.equal(manifest.short_name, "Team Analyzer");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, ".");
  assert.equal(manifest.scope, ".");
  assert.ok(manifest.icons.some((icon) => icon.sizes === "192x192" && icon.type === "image/png"));
  assert.ok(manifest.icons.some((icon) => icon.sizes === "512x512" && icon.type === "image/png"));
  assert.ok(cacheName, "El service worker debe declarar una caché versionada.");
}

function createServer() {
  let serveCurrentWorker = false;
  const mimeTypes = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".xlsx": "application/octet-stream",
  };

  const server = http.createServer((request, response) => {
    const url = new URL(request.url, "http://127.0.0.1");
    if (url.pathname === "/__seed") {
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
      response.end(`<!doctype html><script>
        caches.open(${JSON.stringify(previousCacheName)}).then(async (cache) => {
          await cache.put(new Request(location.origin + "/legacy-marker"), new Response("old cache"));
          location.replace("/");
        }).catch((error) => { document.body.textContent = String(error); });
      </script>`);
      return;
    }

    if (url.pathname === "/sw.js") {
      response.writeHead(200, {
        "Content-Type": "text/javascript; charset=utf-8",
        "Cache-Control": "no-cache",
        "Service-Worker-Allowed": "/",
      });
      response.end(serveCurrentWorker ? serviceWorker : legacyWorker);
      return;
    }

    const pathname = decodeURIComponent(url.pathname);
    const filePath = path.resolve(root, "." + pathname);
    const relative = path.relative(root, filePath);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }

    fs.stat(filePath, (error, stats) => {
      const resolved = error || stats.isDirectory() ? path.join(filePath, "index.html") : filePath;
      fs.readFile(resolved, (readError, body) => {
        if (readError) {
          response.writeHead(404);
          response.end("Not found");
          return;
        }
        const type = mimeTypes[path.extname(resolved).toLowerCase()] || "application/octet-stream";
        response.writeHead(200, { "Content-Type": type });
        response.end(body);
      });
    });
  });

  return { server, setServeCurrentWorker: () => { serveCurrentWorker = true; } };
}

async function waitForBaseLoaded(page) {
  await page.locator("#top").click();
  await page.locator("#topMenu .picker-item").first().waitFor({
    state: "visible",
    timeout: 30_000,
  });
  const status = await page.locator("#statusPill").innerText();
  assert.notEqual(status, "Sin base", "La app no debe mostrar error de carga del Excel.");
}

async function waitForCacheMigration(page) {
  const deadline = Date.now() + 30_000;
  let names = [];
  while (Date.now() < deadline) {
    names = await page.evaluate(() => caches.keys());
    if (names.includes("lol-team-analyzer-v13") && !names.includes("lol-team-analyzer-v12")) {
      return names;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("No se completó la migración de caché v12 a v13: " + JSON.stringify(names));
}

async function main() {
  validateInstallMetadata();
  const { server, setServeCurrentWorker } = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const origin = `http://127.0.0.1:${address.port}`;
  let browser;

  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ serviceWorkers: "allow" });
    const page = await context.newPage();
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    // Begin with a v12 installation. The updated worker must replace it and delete its cache.
    await page.goto(`${origin}/__seed`, { waitUntil: "domcontentloaded" });
    await page.waitForURL(`${origin}/`);
    await waitForBaseLoaded(page);
    const iconDimensions = await page.evaluate(async () => {
      const data = await (await fetch("manifest.json")).json();
      return Promise.all(data.icons.filter((icon) => icon.type === "image/png").map((icon) =>
        new Promise((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve([image.naturalWidth, image.naturalHeight]);
          image.onerror = reject;
          image.src = icon.src;
        })
      ));
    });
    assert.deepEqual(iconDimensions, [[192, 192], [512, 512]], "Los iconos declarados deben existir con sus dimensiones reales.");
    await page.waitForFunction(
      () => Boolean(navigator.serviceWorker.controller),
      null,
      { timeout: 15_000 }
    );

    const beforeUpdate = await page.evaluate(async () => ({
      cacheNames: await caches.keys(),
      worker: (await navigator.serviceWorker.ready).active?.scriptURL,
    }));
    assert.ok(beforeUpdate.cacheNames.includes(previousCacheName), "La instalación antigua v12 debe estar activa al inicio de la prueba.");

    setServeCurrentWorker();
    await page.evaluate(async () => (await navigator.serviceWorker.ready).update());
    await waitForCacheMigration(page);

    const parserCache = await page.evaluate(async ({ current, url }) => {
      const names = await caches.keys();
      const cacheEntries = await Promise.all(names.map(async (name) => [
        name,
        (await caches.open(name)).keys().then((keys) => keys.map((request) => request.url)),
      ]));
      const currentCache = await caches.open(current);
      const keys = await currentCache.keys();
      const key = keys.find((request) => request.url === new URL(url, location.origin).href);
      const response = key ? await currentCache.match(key) : null;
      return {
        type: response?.type || null,
        status: response?.status ?? null,
        cachedUrls: keys.map((request) => request.url),
        cacheNames: names,
        allEntries: await Promise.all(cacheEntries.map(async ([name, entries]) => [name, await entries])),
        controller: navigator.serviceWorker.controller?.scriptURL,
      };
    }, { current: cacheName, url: xlsxUrl });
    assert.ok(parserCache.type, "SheetJS debe estar guardado en la caché nueva: " + JSON.stringify(parserCache));
    assert.equal(parserCache.status, 200, "SheetJS debe servirse desde la caché local.");

    // A controlled reload with the network disconnected must load the workbook and picker.
    await context.setOffline(true);
    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForBaseLoaded(page);
    const firstOption = page.locator("#topMenu .picker-item").first();
    await firstOption.waitFor({ state: "visible", timeout: 15_000 });
    await firstOption.click();
    const selected = await page.locator("#top").inputValue();
    assert.ok(selected, "El selector debe permitir elegir un campeón sin conexión.");
    assert.ok((await page.locator("#result").innerText()).includes(selected), "El resultado debe actualizarse sin conexión.");
    assert.deepEqual(pageErrors, [], "La app no debe lanzar errores JavaScript durante la carga o el uso offline.");

    console.log("PWA validada: manifiesto instalable, carga inicial, actualización v12→v13, caché de SheetJS y selección offline.");
    await context.close();
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
