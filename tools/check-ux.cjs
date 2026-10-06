#!/usr/bin/env node
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { chromium } = require("playwright");
const root = path.resolve(__dirname, "..");
const widths = [320, 375, 768, 1280];
const champions = ["Aatrox", "Briar", "Anivia", "Draven", "Janna"];
function serverForApp() {
 const mime={".css":"text/css",".html":"text/html",".js":"text/javascript",".json":"application/json",".png":"image/png",".svg":"image/svg+xml",".xlsx":"application/octet-stream"};
 return http.createServer((req,res)=>{const file=path.resolve(root,"."+decodeURIComponent(new URL(req.url,"http://localhost").pathname));const rel=path.relative(root,file);if(rel.startsWith("..")||path.isAbsolute(rel)){res.writeHead(403);res.end();return;}fs.stat(file,(e,s)=>{const resolved=e||s.isDirectory()?path.join(file,"index.html"):file;fs.readFile(resolved,(err,data)=>{if(err){res.writeHead(404);res.end();return;}res.writeHead(200,{"Content-Type":mime[path.extname(resolved)]||"application/octet-stream","Cache-Control":"no-store"});res.end(data);});});});
}
async function main(){
 const server=serverForApp();await new Promise(r=>server.listen(0,"127.0.0.1",r));let browser;
 try{
  browser=await chromium.launch({headless:true});const page=await browser.newPage({serviceWorkers:"block"});const pageErrors=[],consoleErrors=[];
  page.on("pageerror",e=>pageErrors.push(e.message));page.on("console",m=>{if(m.type()==="error")consoleErrors.push(m.text());});
  await page.route("https://ddragon.leagueoflegends.com/**",r=>r.fulfill({status:200,contentType:"application/json",body:r.request().url().endsWith("/versions.json")?'["14.1.1"]':'{"data":{}}'}));
  for(const width of widths){
   await page.setViewportSize({width,height:900});await page.goto("http://127.0.0.1:"+server.address().port+"/",{waitUntil:"domcontentloaded"});await page.waitForFunction(()=>document.querySelector("#statusPill")?.textContent==="Faltan campeones");
   assert.equal(await page.locator("#statusPill").getAttribute("role"),"status");assert.equal(await page.locator("#statusPill").getAttribute("aria-live"),"polite");
   const cols=width<=720?1:width<=860?2:width<=1180?3:5;assert.equal(await page.locator(".roles-grid").evaluate(n=>getComputedStyle(n).gridTemplateColumns.split(" ").length),cols,"columnas @"+width);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,"overflow @"+width);
   for(const id of ["top","jungle","mid","adc","support"]){const el=page.locator("#"+id);assert.equal(await el.evaluate(n=>n.labels?.length===1),true,"label #"+id);assert.equal(await el.getAttribute("role"),"combobox");}
   await page.keyboard.press("Tab");assert.equal(await page.evaluate(()=>document.activeElement.id),"top");assert.notEqual(await page.locator("#top").evaluate(n=>getComputedStyle(n).outlineStyle),"none","focus visible");
   for(let i=0;i<champions.length;i++){const id=["top","jungle","mid","adc","support"][i];await page.keyboard.type(champions[i]);await page.keyboard.press("Enter");assert.equal(await page.locator("#"+id).inputValue(),champions[i]);if(i<4){await page.keyboard.press("Tab");assert.equal(await page.evaluate(()=>document.activeElement.id),["jungle","mid","adc","support"][i]);}}
   await page.waitForFunction(()=>document.querySelector("#statusPill")?.textContent==="Listo");assert.equal(await page.locator(".composition-table tbody tr").count(),5);if(width<=760)assert.equal(await page.locator(".composition-table").evaluate(n=>n.getBoundingClientRect().width<=innerWidth),true);
   await page.keyboard.press("Tab");assert.equal(await page.evaluate(()=>document.activeElement.id),"demoBtn");await page.keyboard.press("Tab");assert.equal(await page.evaluate(()=>document.activeElement.id),"versionBadge");await page.keyboard.press("Enter");assert.equal(await page.locator("#versionBadge").getAttribute("aria-expanded"),"true");await page.keyboard.press("Escape");assert.equal(await page.locator("#versionBadge").getAttribute("aria-expanded"),"false");
  }
  assert.deepEqual(pageErrors,[],"sin errores JavaScript");assert.deepEqual(consoleErrors,[],"sin errores en consola");console.log("UX validada: 320, 375, 768, 1280 px; flujo completo con teclado; etiquetas, estado accesible, foco visible, tabla y consola.");
 }finally{if(browser)await browser.close();await new Promise((r,j)=>server.close(e=>e?j(e):r()));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
