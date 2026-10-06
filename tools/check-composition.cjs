#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const roles = [
  { key: "top", input: "#top", menu: "#topMenu", sheet: "Tabla Top" },
  { key: "jungle", input: "#jungle", menu: "#jungleMenu", sheet: "Tabla Jungla" },
  { key: "mid", input: "#mid", menu: "#midMenu", sheet: "Tabla Mid" },
  { key: "botline", input: "#adc", menu: "#botlineMenu", sheet: "Tabla Botline" },
  { key: "support", input: "#support", menu: "#supportMenu", sheet: "Tabla Support" },
];

function createServer() {
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
    const filePath = path.resolve(root, "." + decodeURIComponent(url.pathname));
    const relative = path.relative(root, filePath);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }

    fs.stat(filePath, (statError, stats) => {
      const resolved = statError || stats.isDirectory() ? path.join(filePath, "index.html") : filePath;
      fs.readFile(resolved, (readError, body) => {
        if (readError) {
          response.writeHead(404);
          response.end("Not found");
          return;
        }
        response.writeHead(200, {
          "Content-Type": mimeTypes[path.extname(resolved).toLowerCase()] || "application/octet-stream",
          "Cache-Control": "no-store",
        });
        response.end(body);
      });
    });
  });

  return server;
}

async function main() {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = "http://127.0.0.1:" + server.address().port;
  let browser;

  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ serviceWorkers: "block" });
    const page = await context.newPage();
    const pageErrors = [];
    const consoleErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });

    // Data Dragon is optional for composition logic; stub it so the test stays deterministic.
    await page.route("https://ddragon.leagueoflegends.com/**", async (route) => {
      if (route.request().url().endsWith("/versions.json")) {
        await route.fulfill({ status: 200, contentType: "application/json", body: '["14.1.1"]' });
      } else {
        await route.fulfill({ status: 200, contentType: "application/json", body: '{"data":{}}' });
      }
    });

    await page.goto(origin + "/", { waitUntil: "domcontentloaded" });

    const expectedByRole = await page.evaluate(async (roleDefs) => {
      const response = await fetch("Draft Pool.xlsx");
      if (!response.ok) throw new Error("Draft Pool.xlsx respondió HTTP " + response.status);
      if (!window.XLSX) throw new Error("SheetJS no está disponible para comprobar el workbook");
      const workbook = XLSX.read(await response.arrayBuffer(), { type: "array" });
      const result = {};

      for (const role of roleDefs) {
        const sheet = workbook.Sheets[role.sheet];
        if (!sheet) throw new Error("Falta la hoja " + role.sheet);
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        const champions = Array.from(new Set(rows.map((row) => String(row["Campeón"] || "").trim()).filter(Boolean)));
        champions.sort((a, b) => a.localeCompare(b, "es"));
        if (!champions.length) throw new Error("La hoja " + role.sheet + " no contiene campeones");
        result[role.key] = champions;
      }
      return result;
    }, roles);

    // Every selector must contain exactly the champions from its own workbook sheet.
    for (const role of roles) {
      const input = page.locator(role.input);
      const menu = page.locator(role.menu);
      await input.click({ force: true });
      await menu.locator(".picker-item").first().waitFor({ state: "visible", timeout: 20_000 });
      const actual = await menu.locator(".picker-item").evaluateAll((items) =>
        items.map((item) => item.getAttribute("data-champion"))
      );
      assert.deepEqual(
        actual,
        expectedByRole[role.key].slice(0, 60),
        "La lista " + role.key + " debe coincidir con " + role.sheet + " del Excel"
      );
      assert.equal(new Set(actual).size, actual.length, "La lista " + role.key + " no debe repetir opciones");
      await input.press("Escape");
    }

    // Select a champion and verify that the live result reflects the selection immediately.
    const firstTopChampion = expectedByRole.top[0];
    await page.locator("#top").click({ force: true });
    await page.locator("#topMenu").getByText(firstTopChampion, { exact: true }).click();
    await page.waitForFunction(
      (champion) => document.querySelector("#result .champion-name")?.textContent.trim() === champion,
      firstTopChampion,
      { timeout: 5_000 }
    );
    assert.equal(await page.locator("#top").inputValue(), firstTopChampion);
    assert.equal(await page.locator("#result .champion-name").first().innerText(), firstTopChampion);

    // When the workbook allows the same champion in two roles, it must be hidden from the second menu.
    let duplicatePair = null;
    for (const firstRole of roles) {
      for (const secondRole of roles) {
        if (firstRole.key === secondRole.key) continue;
        const shared = expectedByRole[firstRole.key].find((champion) =>
          expectedByRole[secondRole.key].some((candidate) =>
            candidate.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() ===
            champion.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
          )
        );
        if (shared) {
          duplicatePair = { firstRole, secondRole, champion: shared };
          break;
        }
      }
      if (duplicatePair) break;
    }

    await page.locator("#demoBtn").click();
    const duplicateChampion = duplicatePair?.champion || firstTopChampion;
    await page.locator("#top").fill(duplicateChampion);
    await page.locator("#jungle").fill(duplicateChampion);
    await page.waitForFunction(
      () => document.querySelector("#statusPill")?.textContent.includes("Campeón repetido"),
      null,
      { timeout: 5_000 }
    );
    assert.equal(await page.locator("#top").getAttribute("aria-invalid"), "true");
    assert.equal(await page.locator("#jungle").getAttribute("aria-invalid"), "true");

    if (duplicatePair) {
      await page.locator("#demoBtn").click();
      await page.locator(duplicatePair.firstRole.input).fill(duplicatePair.champion);
      await page.locator(duplicatePair.secondRole.input).click({ force: true });
      await page.locator(duplicatePair.secondRole.menu + " .picker-item").first().waitFor({ state: "visible" });
      await page.waitForFunction(
        ({ menuSelector, champion }) => Array.from(document.querySelectorAll(menuSelector + " .picker-item")).every((item) =>
          item.getAttribute("data-champion").toLowerCase() !== champion.toLowerCase()
        ),
        { menuSelector: duplicatePair.secondRole.menu, champion: duplicatePair.champion },
        { timeout: 5_000 }
      );
      const secondRoleOptions = await page.locator(duplicatePair.secondRole.menu + " .picker-item").evaluateAll((items) =>
        items.map((item) => item.getAttribute("data-champion"))
      );
      assert.ok(
        !secondRoleOptions.some((name) => name.toLowerCase() === duplicatePair.champion.toLowerCase()),
        "Un campeón ya seleccionado debe desaparecer de otros roles"
      );
    }

    // Invalid manual input is marked clearly and the live table does not crash.
    await page.locator("#demoBtn").click();
    const invalidChampion = "NoEsUnCampeon";
    await page.locator("#top").fill(invalidChampion);
    await page.waitForFunction(
      (name) => document.querySelector("#statusPill")?.textContent.includes(name + " no está en la lista de TOP"),
      invalidChampion,
      { timeout: 5_000 }
    );
    assert.equal(await page.locator("#top").getAttribute("aria-invalid"), "true");
    assert.equal(await page.locator("#result .champion-name").first().innerText(), invalidChampion);

    await page.locator("#demoBtn").click();
    for (const role of roles) assert.equal(await page.locator(role.input).inputValue(), "");
    assert.deepEqual(pageErrors, [], "El flujo normal de composición no debe lanzar errores JavaScript");
    assert.deepEqual(consoleErrors, [], "El flujo normal de composición no debe escribir errores en consola");

    console.log(
      "Composición validada: " +
      roles.map((role) => role.key + "=" + expectedByRole[role.key].length).join(", ") +
      "; listas por rol, duplicados, entrada inválida, tiempo real y consola sin errores."
    );
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
