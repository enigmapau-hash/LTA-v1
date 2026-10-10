#!/usr/bin/env node
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { chromium } = require("playwright");
const root = path.resolve(__dirname, "..");
const widths = [320, 375, 390, 768, 1280];
const champions = ["Aatrox", "Briar", "Anivia", "Draven", "Janna"];
function serverForApp() {
 const mime={".css":"text/css",".html":"text/html",".js":"text/javascript",".json":"application/json",".png":"image/png",".svg":"image/svg+xml",".xlsx":"application/octet-stream"};
 return http.createServer((req,res)=>{const file=path.resolve(root,"."+decodeURIComponent(new URL(req.url,"http://localhost").pathname));const rel=path.relative(root,file);if(rel.startsWith("..")||path.isAbsolute(rel)){res.writeHead(403);res.end();return;}fs.stat(file,(e,s)=>{const resolved=e||s.isDirectory()?path.join(file,"index.html"):file;fs.readFile(resolved,(err,data)=>{if(err){res.writeHead(404);res.end();return;}res.writeHead(200,{"Content-Type":mime[path.extname(resolved)]||"application/octet-stream","Cache-Control":"no-store"});res.end(data);});});});
}
async function main(){
 const server=serverForApp();await new Promise(r=>server.listen(0,"127.0.0.1",r));let browser;
 try{
  const launchOptions={headless:true};if(process.env.LTA_CHROMIUM_PATH)launchOptions.executablePath=process.env.LTA_CHROMIUM_PATH;
  browser=await chromium.launch(launchOptions);const page=await browser.newPage({serviceWorkers:"block"});const pageErrors=[],consoleErrors=[];
  page.on("pageerror",e=>pageErrors.push(e.message));page.on("console",m=>{if(m.type()==="error")consoleErrors.push(m.text());});
  await page.route("https://ddragon.leagueoflegends.com/**",r=>r.fulfill({status:200,contentType:"application/json",body:r.request().url().endsWith("/versions.json")?'["14.1.1"]':'{"data":{}}'}));
  for(const width of widths){
   await page.setViewportSize({width,height:900});await page.goto("http://127.0.0.1:"+server.address().port+"/",{waitUntil:"domcontentloaded"});await page.waitForFunction(()=>document.querySelector("#statusPill")?.textContent==="Completa tu equipo");assert.match(await page.locator("#result").innerText(),/El análisis aparecerá aquí al completar los cinco roles\./);
   assert.equal(await page.title(),"League Team Analyzer");assert.equal(await page.locator("h1").innerText(),"League Team Analyzer");assert.doesNotMatch(await page.locator('meta[name="description"]').getAttribute("content"),/Excel|mini app/i,"la descripción presenta el producto, no su implementación");
   assert.equal(await page.locator("#statusPill").getAttribute("role"),"status");assert.equal(await page.locator("#statusPill").getAttribute("aria-live"),"polite");
   const cols=width<390?1:width<=720?2:width<=860?2:width<=1180?3:5;assert.equal(await page.locator(".roles-grid").evaluate(n=>getComputedStyle(n).gridTemplateColumns.split(" ").length),cols,"columnas @"+width);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,"overflow @"+width);
   for(const id of ["top","jungle","mid","adc","support"]){const el=page.locator("#"+id);assert.equal(await el.evaluate(n=>n.labels?.length===1),true,"label #"+id);assert.equal(await el.getAttribute("role"),"combobox");}
   await page.keyboard.press("Tab");assert.equal(await page.evaluate(()=>document.activeElement.id),"top");assert.notEqual(await page.locator("#top").evaluate(n=>getComputedStyle(n).outlineStyle),"none","focus visible");
   for(let i=0;i<champions.length;i++){const id=["top","jungle","mid","adc","support"][i];await page.keyboard.type(champions[i]);await page.keyboard.press("Enter");assert.equal(await page.locator("#"+id).inputValue(),champions[i]);if(i<4){await page.keyboard.press("Tab");assert.equal(await page.evaluate(()=>document.activeElement.id),["jungle","mid","adc","support"][i]);}}
   await page.waitForFunction(()=>document.querySelector("#statusPill")?.textContent==="Análisis actualizado");assert.equal(await page.locator(".composition-table tbody tr").count(),5);if(width<=760)assert.equal(await page.locator(".composition-table").evaluate(n=>n.getBoundingClientRect().width<=innerWidth),true);
   await page.keyboard.press("Tab");assert.equal(await page.evaluate(()=>document.activeElement.id),"demoBtn");let badgeReached=false;for(let tab=0;tab<5;tab++){await page.keyboard.press("Tab");if(await page.evaluate(()=>document.activeElement.id)==="versionBadge"){badgeReached=true;break;}}assert.equal(badgeReached,true,"el panel de versión debe ser alcanzable por Tab");await page.keyboard.press("Enter");assert.equal(await page.locator("#versionBadge").getAttribute("aria-expanded"),"true");await page.keyboard.press("Escape");assert.equal(await page.locator("#versionBadge").getAttribute("aria-expanded"),"false");
  }
  const referencePicks={top:"Ornn",jungle:"Sejuani",mid:"Orianna",adc:"Jinx",support:"Lulu"};
  for(const [role,champion] of Object.entries(referencePicks))await page.locator("#"+role).fill(champion);
  await page.waitForFunction(()=>document.querySelector("#statusPill")?.textContent==="Análisis actualizado");
  await page.waitForFunction(expected=>expected.every(champion=>Array.from(document.querySelectorAll(".composition-table .champion-name")).some(node=>node.textContent.trim()===champion)),Object.values(referencePicks));
  const strategy=page.locator(".result-summary__strategy");await strategy.waitFor({state:"visible"});
  assert.match(await strategy.locator("h3").first().innerText(),/Front to Back/);
  for(const heading of ["Plan de partida","Fortalezas","Riesgos"]){assert.equal(await strategy.getByRole("heading",{name:heading,exact:true}).count(),1,"el informe muestra "+heading);}
  for(const heading of ["Win condition","Sinergia interna","Debilidades","Cómo jugarla","Recomendaciones","Picks","Bans"]){assert.equal(await strategy.getByRole("heading",{name:heading,exact:true}).count(),0,"el informe no repite el bloque "+heading);}
  assert.equal(await strategy.locator(".result-summary__strategy-card").count(),3,"el resumen estratégico conserva solo tres bloques útiles");
  assert.match(await strategy.innerText(),/Protege al ADC/i);assert.match(await strategy.innerText(),/Frontline/i);assert.match(await strategy.innerText(),/Poca presión lateral/i);
  assert.match(await strategy.innerText(),/Pieza clave: Lulu \(−18 puntos de ajuste si falta\)/i);assert.match(await strategy.innerText(),/Estabilidad: la identidad se mantiene aunque falte cualquier pick/i);
  assert.equal(await page.locator(".result-summary__header").evaluate(n=>getComputedStyle(n).display),"none","el estado de validación se omite en composiciones completas");
  assert.equal(await page.locator(".result-summary.is-ready").evaluate(n=>getComputedStyle(n).paddingTop),"0px","el informe completo evita un marco exterior redundante");
  assert.equal(await strategy.evaluate(n=>getComputedStyle(n).borderTopWidth),"1px","la tarjeta estratégica mantiene su contorno visible");
  assert.equal(await page.locator(".result-summary__global").count(),0,"no aparece el resumen global redundante");
  assert.equal(await page.locator(".result-summary__roles").count(),0,"no se genera una segunda lista de campeones redundante");
  assert.equal(await strategy.evaluate(n=>n.closest(".table-wrap")===null),true,"el informe estratégico debe quedar fuera del contenedor desplazable de la tabla");
  const completeTable=page.locator(".composition-table.is-complete");
  assert.equal(await completeTable.locator("thead th").allInnerTexts().then(values=>values.map(value=>value.trim()).join("|")),"Rol|Campeón|Función|Ritmo","la alineación conserva solo columnas que complementan el informe");
  assert.equal(await completeTable.locator("tbody tr").count(),5,"la alineación completa mantiene los cinco roles");
  assert.equal(await completeTable.locator("tbody tr").first().locator("td").count(),4,"cada rol mantiene campeón, función y ritmo");
  assert.match(await completeTable.innerText(),/Ornn/);assert.match(await completeTable.innerText(),/Lulu/);
  assert.equal(await strategy.evaluate(n=>n.getBoundingClientRect().top)>await completeTable.evaluate(n=>n.getBoundingClientRect().top),true,"la composición aparece antes que el análisis");
  assert.match(await page.locator(".composition-table").innerText(),/Ornn/);assert.match(await page.locator(".composition-table").innerText(),/Sejuani/);
  for(const width of widths){await page.setViewportSize({width,height:900});const layout=await page.evaluate(()=>({strategy:document.querySelector(".result-summary__strategy").getBoundingClientRect(),table:document.querySelector(".composition-table").getBoundingClientRect(),scrollWidth:document.documentElement.scrollWidth}));assert.equal(layout.strategy.width<=width,true,"el informe estratégico cabe en "+width+" px");assert.equal(layout.strategy.top>layout.table.top,true,"la composición precede al informe en "+width+" px");assert.equal(layout.scrollWidth<=width,true,"la composición completa no desborda en "+width+" px");}
  await page.setViewportSize({width:1280,height:900});
  const splitPushPicks={top:"Fiora",jungle:"Viego",mid:"Twisted Fate",adc:"Ezreal",support:"Braum"};
  for(const [role,champion] of Object.entries(splitPushPicks))await page.locator("#"+role).fill(champion);
  await page.waitForFunction(expected=>expected.every(champion=>Array.from(document.querySelectorAll(".composition-table .champion-name")).some(node=>node.textContent.trim()===champion))&&document.querySelector(".result-summary__strategy h3")?.textContent.includes("Split Push"),Object.values(splitPushPicks));
  const splitStrategy=await strategy.innerText();assert.match(splitStrategy,/Fiora.*el equipo pierde una identidad principal clara/i);assert.match(splitStrategy,/Twisted Fate.*plan cambia a Escalado.*picos de poder/i);
  const topInput=page.locator("#top"),selectedTop=await topInput.inputValue();await topInput.click();
  assert.deepEqual(await topInput.evaluate(input=>[input.selectionStart,input.selectionEnd]),[0,selectedTop.length],"al enfocar un pick se selecciona todo el texto para reemplazarlo sin borrarlo");
  const topOptions=page.locator("#topMenu .picker-item");await topOptions.first().waitFor({state:"visible"});
  const replacementIndex=await topOptions.evaluateAll((items,current)=>items.findIndex(item=>item.dataset.champion!==current),selectedTop);
  assert.notEqual(replacementIndex,-1,"la lista abierta debe ofrecer picks alternativos sin escribir una búsqueda");
  const replacement=await topOptions.nth(replacementIndex).getAttribute("data-champion");await topOptions.nth(replacementIndex).click();
  await page.waitForFunction(champion=>document.querySelector("#top")?.value===champion,replacement);
  assert.equal(await page.evaluate(()=>document.activeElement.id),"top","el foco vuelve al selector tras cambiar un campeón con clic");
  await page.locator("#demoBtn").click();
  const partialPicks=[
   ["top","Ornn"],
   ["jungle","Sejuani"],
   ["mid","Orianna"],
   ["adc","Jinx"],
  ];
  const remainingRoles=["JUNGLA","MID","BOTLINE","SUPPORT"];
  for(let count=1;count<=partialPicks.length;count++){
   const [role,champion]=partialPicks[count-1];await page.locator("#"+role).fill(champion);
   const remaining=remainingRoles.slice(count-1).join(" · ");
   await page.waitForFunction(expected=>document.querySelector(".result-summary__subhead")?.textContent.includes(`Faltan: ${expected}.`),remaining);
   assert.equal(await page.locator(".result-summary__subhead").innerText(),`Faltan: ${remaining}.`);
   assert.equal(await page.locator("#statusPill").innerText(),"Composición actualizada","el estado parcial no presenta el análisis como completo");
   assert.equal(await page.locator(".result-summary__strategy").count(),0,"no se muestra el informe antes de completar cinco campeones");
   assert.equal(await page.locator(".result-summary__header").innerText().then(text=>text.includes(`${count}/5`)),true,"se indica el progreso con "+count+" picks");
   assert.equal(await page.locator(".pick-recommendations__role").count(),5-count,"se conservan recomendaciones solo para los roles vacíos con "+count+" picks");
   assert.equal(await page.locator(".pick-recommendations__heading .result-summary__eyebrow").count(),0,"las recomendaciones no repiten que la composición está incompleta");
  }
  const suggestions=page.locator(".pick-recommendations");
  await page.waitForFunction(()=>["Ornn","Sejuani","Orianna","Jinx"].every((champion,index)=>document.querySelector(["#top","#jungle","#mid","#adc"][index])?.value===champion)&&document.querySelectorAll(".pick-recommendations__role").length===1);
  const supportSuggestions=suggestions.locator(".pick-recommendations__role").filter({hasText:"SUPPORT"});
  assert.equal(await page.locator(".result-summary.is-pending .result-summary__header").evaluate(n=>getComputedStyle(n).display),"flex","el estado de validación permanece visible en composiciones incompletas");
  assert.equal(await supportSuggestions.locator("ol > li").count(),3,"un rol vacío debe mostrar tres candidatos recomendados");
  assert.match(await supportSuggestions.innerText(),/Lulu/);assert.match(await supportSuggestions.innerText(),/Afinidad/);assert.match(await supportSuggestions.innerText(),/Aporta:/);assert.match(await supportSuggestions.innerText(),/Plan asociado/);
  assert.equal(await supportSuggestions.locator(".pick-recommendations__quality.is-best").count(),2,"las opciones empatadas en la mejor puntuación comparten la etiqueta superior");
  const planItems=await supportSuggestions.locator(".pick-recommendations__plans li").allInnerTexts();assert.equal(planItems.length,2,"el plan se muestra una vez por orientación distinta, no una vez por campeón");assert.equal(new Set(planItems).size,planItems.length,"no se repiten explicaciones de plan");
  await page.locator("#support").fill("Lulu");await page.waitForFunction(()=>document.querySelector(".result-summary__strategy h3")?.textContent.includes("Front to Back"));
  assert.equal(await page.locator(".pick-recommendations").count(),0,"las recomendaciones se ocultan al completar la composición");
  assert.deepEqual(pageErrors,[],"sin errores JavaScript");assert.deepEqual(consoleErrors,[],"sin errores en consola");console.log("UX validada: 320, 375, 390, 768, 1280 px; informe estratégico adaptativo; teclado, accesibilidad, tabla y consola.");
 }finally{if(browser)await browser.close();await new Promise((r,j)=>server.close(e=>e?j(e):r()));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
