const WORKBOOK_URLS = [
  "https://raw.githubusercontent.com/enigmapau-hash/lol-team-analyzer-v2/main/Draft%20Pool.xlsx",
  encodeURI("Draft Pool.xlsx"),
];

const DDragonVersionsURL = "https://ddragon.leagueoflegends.com/api/versions.json";
const DDragonChampionDataURL = (version) =>
  `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`;
const DDragonIconURL = (version, id) =>
  `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${id}.png`;

const ROLE_FIELDS = [
  { key: "top", label: "TOP", inputId: "top", menuId: "topMenu" },
  { key: "jungle", label: "JUNGLA", inputId: "jungle", menuId: "jungleMenu" },
  { key: "mid", label: "MID", inputId: "mid", menuId: "midMenu" },
  { key: "botline", label: "BOTLINE", inputId: "adc", menuId: "botlineMenu" },
  { key: "support", label: "SUPPORT", inputId: "support", menuId: "supportMenu" },
];

const SHEET_MAP = {
  top: "Tabla Top",
  jungle: "Tabla Jungla",
  mid: "Tabla Mid",
  botline: "Tabla Botline",
  support: "Tabla Support",
};

const els = {
  top: document.getElementById("top"),
  jungle: document.getElementById("jungle"),
  mid: document.getElementById("mid"),
  adc: document.getElementById("adc"),
  support: document.getElementById("support"),
  topMenu: document.getElementById("topMenu"),
  jungleMenu: document.getElementById("jungleMenu"),
  midMenu: document.getElementById("midMenu"),
  botlineMenu: document.getElementById("botlineMenu"),
  supportMenu: document.getElementById("supportMenu"),
  analyzeBtn: document.getElementById("analyzeBtn"),
  demoBtn: document.getElementById("demoBtn"),
  result: document.getElementById("result"),
  statusPill: document.getElementById("statusPill"),
};

const menuState = new Map();

let draftData = null;
let championMeta = new Map();
let workbookReady = false;
let analyzeQueued = false;
let activeRoleKey = null;
let viewportUpdateQueued = false;

function roleInput(roleKey) {
  return els[roleKey === "botline" ? "adc" : roleKey] || null;
}

function roleMenu(roleKey) {
  return els[`${roleKey === "botline" ? "botline" : roleKey}Menu`] || null;
}

function setStatus(text) {
  els.statusPill.textContent = text;
}

function setBusy(isBusy) {
  els.analyzeBtn.disabled = isBusy;
  els.demoBtn.disabled = isBusy;
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/["'`´’]/g, "")
    .trim()
    .toLowerCase();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function readComposition() {
  return {
    top: els.top.value.trim(),
    jungle: els.jungle.value.trim(),
    mid: els.mid.value.trim(),
    adc: els.adc.value.trim(),
    support: els.support.value.trim(),
  };
}

function renderEmpty(message) {
  els.result.className = "result-empty";
  els.result.innerHTML = message;
}

function getRoleRows(roleKey) {
  return draftData?.roles?.[roleKey] || [];
}

function buildChampionList(roleKey) {
  const champions = new Set();
  for (const row of getRoleRows(roleKey)) {
    if (row?.champion) champions.add(row.champion);
  }
  return [...champions].sort((a, b) => a.localeCompare(b, "es"));
}

function getChampionMeta(name) {
  return championMeta.get(normalizeText(name)) || null;
}

function findRoleRow(roleKey, championName) {
  const roleRows = getRoleRows(roleKey);
  if (!Array.isArray(roleRows) || !championName) return null;
  const target = normalizeText(championName);
  return roleRows.find((row) => normalizeText(row?.champion) === target) || null;
}

function findDuplicateChampion(comp) {
  const seen = new Set();
  for (const champion of Object.values(comp)) {
    if (!champion) continue;
    const key = normalizeText(champion);
    if (!key) continue;
    if (seen.has(key)) return champion;
    seen.add(key);
  }
  return null;
}

function firstInvalidRole(comp) {
  for (const role of ROLE_FIELDS) {
    const champ = comp[role.key === "botline" ? "adc" : role.key];
    if (champ && !findRoleRow(role.key, champ)) {
      return { role: role.key, champion: champ };
    }
  }
  return null;
}

function setInputValidity(input, isInvalid) {
  if (!input) return;
  input.classList.toggle("input-error", Boolean(isInvalid));
  input.setAttribute("aria-invalid", isInvalid ? "true" : "false");
}

function clearInputValidity() {
  for (const role of ROLE_FIELDS) {
    setInputValidity(roleInput(role.key), false);
  }
}

function markDuplicateInputs(duplicateChampion) {
  const target = normalizeText(duplicateChampion);
  for (const role of ROLE_FIELDS) {
    const input = roleInput(role.key);
    setInputValidity(input, normalizeText(input?.value) === target);
  }
}

function isCompactViewport() {
  return window.matchMedia("(max-width: 720px)").matches;
}

function portalizeMenus() {
  for (const role of ROLE_FIELDS) {
    const menu = roleMenu(role.key);
    const input = roleInput(role.key);
    if (!menu || !input) continue;

    if (menu.parentElement !== document.body) {
      document.body.appendChild(menu);
    }

    menu.setAttribute("role", "listbox");
    menu.setAttribute("aria-label", `${role.label} champions`);
    menu.setAttribute("aria-hidden", "true");
    menu.hidden = true;
    menu.style.visibility = "hidden";
    menu.style.opacity = "0";

    input.setAttribute("role", "combobox");
    input.setAttribute("aria-autocomplete", "list");
    input.setAttribute("aria-expanded", "false");
    input.setAttribute("aria-controls", menu.id);
    input.setAttribute("autocomplete", "off");
    input.setAttribute("spellcheck", "false");
  }

  document.body.classList.remove("picker-open");
}

function updateBodyPickerState() {
  document.body.classList.toggle("picker-open", Boolean(activeRoleKey));
}

function closeRoleMenu(roleKey) {
  const menu = roleMenu(roleKey);
  const input = roleInput(roleKey);
  if (menu) {
    menu.hidden = true;
    menu.setAttribute("aria-hidden", "true");
    menu.style.visibility = "hidden";
    menu.style.opacity = "0";
  }
  if (input) {
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
  }
  if (menuState.has(roleKey)) {
    menuState.set(roleKey, { ...menuState.get(roleKey), activeIndex: -1 });
  }
  if (activeRoleKey === roleKey) {
    activeRoleKey = null;
  }
  updateBodyPickerState();
}

function closeAllMenus() {
  for (const role of ROLE_FIELDS) closeRoleMenu(role.key);
}

function getMenuItems(menu) {
  return Array.from(menu.querySelectorAll(".picker-item"));
}

function setMenuActiveIndex(roleKey, index, scrollIntoView = true) {
  const menu = roleMenu(roleKey);
  const input = roleInput(roleKey);
  if (!menu || menu.hidden) return;

  const items = getMenuItems(menu);
  if (!items.length) return;

  const nextIndex = ((index % items.length) + items.length) % items.length;
  items.forEach((item, i) => {
    const isActive = i === nextIndex;
    item.classList.toggle("is-active", isActive);
    item.setAttribute("aria-selected", isActive ? "true" : "false");
  });

  menuState.set(roleKey, { ...(menuState.get(roleKey) || {}), activeIndex: nextIndex });

  const activeItem = items[nextIndex];
  if (activeItem && input) {
    input.setAttribute("aria-activedescendant", activeItem.id);
    if (scrollIntoView) activeItem.scrollIntoView({ block: "nearest" });
  }
}

function positionRoleMenu(roleKey) {
  const menu = roleMenu(roleKey);
  const input = roleInput(roleKey);
  if (!menu || !input || menu.hidden) return;

  const rect = input.getBoundingClientRect();
  const padding = 12;
  const gap = 8;
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;

  menu.style.position = "fixed";
  menu.style.zIndex = "9999";
  menu.style.transform = "none";

  const usableWidth = Math.max(240, Math.min(rect.width, viewportW - padding * 2));
  const left = Math.max(padding, Math.min(rect.left, viewportW - usableWidth - padding));
  const estimatedHeight = Math.max(180, Math.min(menu.scrollHeight || 280, viewportH - padding * 2));
  const spaceBelow = viewportH - rect.bottom - padding;
  const spaceAbove = rect.top - padding;
  const openAbove = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;

  menu.classList.toggle("is-above", openAbove);
  menu.classList.toggle("is-compact", isCompactViewport());

  menu.style.width = `${usableWidth}px`;
  menu.style.left = `${left}px`;
  menu.style.right = "auto";

  if (isCompactViewport()) {
    const compactWidth = Math.max(240, Math.min(rect.width, viewportW - padding * 2));
    const compactLeft = Math.max(padding, Math.min(rect.left, viewportW - compactWidth - padding));
    menu.style.width = `${compactWidth}px`;
    menu.style.left = `${compactLeft}px`;
    menu.style.maxHeight = `${Math.max(180, Math.min(320, viewportH - padding * 2))}px`;
    if (openAbove) {
      menu.style.top = `${Math.max(padding, rect.top - Math.min(menu.scrollHeight || 280, 320) - gap)}px`;
    } else {
      menu.style.top = `${Math.min(rect.bottom + gap, viewportH - padding - 180)}px`;
    }
    return;
  }

  if (openAbove) {
    menu.style.top = `${Math.max(padding, rect.top - estimatedHeight - gap)}px`;
  } else {
    menu.style.top = `${Math.min(rect.bottom + gap, viewportH - estimatedHeight - padding)}px`;
  }
  menu.style.maxHeight = `${estimatedHeight}px`;
}

function schedulePositionActiveMenu() {
  if (!activeRoleKey) return;
  if (viewportUpdateQueued) return;
  viewportUpdateQueued = true;
  window.requestAnimationFrame(() => {
    viewportUpdateQueued = false;
    positionRoleMenu(activeRoleKey);
  });
}

function renderRoleMenu(roleKey, query = "") {
  const menu = roleMenu(roleKey);
  const input = roleInput(roleKey);
  if (!menu || !input) return;

  const allNames = draftData ? buildChampionList(roleKey) : [];
  const normalizedQuery = normalizeText(query);
  const filtered = normalizedQuery
    ? allNames.filter((name) => normalizeText(name).includes(normalizedQuery))
    : allNames;

  const items = filtered.slice(0, 60);
  menu.innerHTML = items.length
    ? items
        .map((name, index) => {
          const itemId = `${menu.id}-option-${index}`;
          return `
            <button
              type="button"
              id="${itemId}"
              class="picker-item${index === 0 ? " is-active" : ""}"
              role="option"
              aria-selected="${index === 0 ? "true" : "false"}"
              data-role="${escapeHtml(roleKey)}"
              data-champion="${escapeHtml(name)}"
            >
              <span class="picker-name">${escapeHtml(name)}</span>
            </button>
          `;
        })
        .join("")
    : `<div class="picker-empty">${draftData ? "Sin resultados" : "Cargando base del Excel..."}</div>`;

  menu.hidden = false;
  menu.setAttribute("aria-hidden", "false");
  menu.style.visibility = "hidden";
  menu.style.opacity = "0";
  input.setAttribute("aria-expanded", "true");
  menuState.set(roleKey, { activeIndex: items.length ? 0 : -1 });
  if (items.length) {
    setMenuActiveIndex(roleKey, 0, false);
  } else {
    input.removeAttribute("aria-activedescendant");
  }

  activeRoleKey = roleKey;
  updateBodyPickerState();
  positionRoleMenu(roleKey);
  window.requestAnimationFrame(() => {
    positionRoleMenu(roleKey);
    if (!menu.hidden) {
      menu.style.visibility = "visible";
      menu.style.opacity = "1";
    }
  });
}

function openRoleMenu(roleKey) {
  const input = roleInput(roleKey);
  if (!input) return;
  if (activeRoleKey && activeRoleKey !== roleKey) closeRoleMenu(activeRoleKey);
  activeRoleKey = roleKey;
  renderRoleMenu(roleKey, input.value);
}

function selectChampion(roleKey, championName) {
  const input = roleInput(roleKey);
  if (!input) return;
  input.value = championName;
  closeAllMenus();
  scheduleAnalyze();
}

function renderChampionOptions() {
  closeAllMenus();
}

function renderComposition(comp) {
  const rows = ROLE_FIELDS.map((role) => {
    const valueKey = role.key === "botline" ? "adc" : role.key;
    const champ = comp[valueKey];
    const data = findRoleRow(role.key, champ);
    const meta = champ ? getChampionMeta(champ) : null;
    const missing = Boolean(champ) && !data;
    const unknown = Boolean(champ) && !findRoleRow(role.key, champ);

    const iconMarkup = meta
      ? `<img class="champion-icon" src="${escapeHtml(meta.iconUrl)}" alt="" loading="lazy" />`
      : `<div class="champion-icon placeholder" aria-hidden="true">${escapeHtml(
          champ ? champ.slice(0, 2).toUpperCase() : "—"
        )}</div>`;

    return `
      <tr class="${missing ? "is-missing" : ""} ${unknown ? "is-unknown" : ""}">
        <td data-label="Rol" class="role-cell">${escapeHtml(role.label)}</td>
        <td data-label="Campeón">
          <div class="champion-cell">
            ${iconMarkup}
            <div class="champion-copy">
              <div class="champion-name">${escapeHtml(champ || "—")}</div>
              ${meta?.id ? `<div class="champion-sub">${escapeHtml(meta.id)}</div>` : ""}
            </div>
          </div>
        </td>
        <td data-label="Identidad">${escapeHtml(data?.identity || (champ ? "No encontrado" : ""))}</td>
        <td data-label="Función">${escapeHtml(data?.function || "")}</td>
        <td data-label="Ritmo">${escapeHtml(data?.tempo || "")}</td>
        <td data-label="Fortalezas">${escapeHtml(data?.strengths || "")}</td>
        <td data-label="Debilidades">${escapeHtml(data?.weaknesses || "")}</td>
      </tr>
    `;
  }).join("");

  els.result.className = "result-box";
  els.result.innerHTML = `
    <div class="table-wrap">
      <table class="composition-table">
        <thead>
          <tr>
            <th>Rol</th>
            <th>Campeón</th>
            <th>Identidad</th>
            <th>Función</th>
            <th>Ritmo</th>
            <th>Fortalezas</th>
            <th>Debilidades</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function renderNeedMoreData() {
  renderEmpty("Cargando base del Excel...");
  setStatus("Cargando base...");
}

function analyze() {
  const comp = readComposition();
  const hasAnyChampion = Object.values(comp).some(Boolean);

  if (!hasAnyChampion) {
    clearInputValidity();
    closeAllMenus();
    renderEmpty("Selecciona un campeón en cada rol.");
    setStatus("Faltan campeones");
    return;
  }

  if (!workbookReady) {
    renderNeedMoreData();
    return;
  }

  const duplicate = findDuplicateChampion(comp);
  if (duplicate) {
    markDuplicateInputs(duplicate);
    renderEmpty(`No repitas campeones. Corrige ${escapeHtml(duplicate)}.`);
    setStatus("Campeón repetido");
    return;
  }

  clearInputValidity();
  const invalidRole = firstInvalidRole(comp);
  if (invalidRole) {
    const input = roleInput(invalidRole.role);
    setInputValidity(input, true);
    renderComposition(comp);
    setStatus(`No válido en ${invalidRole.role.toUpperCase()}: ${invalidRole.champion}`);
    return;
  }

  setBusy(true);
  try {
    renderComposition(comp);
    setStatus("Listo");
  } catch (error) {
    renderEmpty(`No se pudo cargar la composición: ${escapeHtml(error.message || "error desconocido")}`);
    setStatus("Error");
  } finally {
    setBusy(false);
  }
}

function scheduleAnalyze() {
  if (analyzeQueued) return;
  analyzeQueued = true;
  window.requestAnimationFrame(() => {
    analyzeQueued = false;
    analyze();
  });
}

function clearSelection() {
  for (const role of ROLE_FIELDS) {
    const input = roleInput(role.key);
    if (input) input.value = "";
    closeRoleMenu(role.key);
  }
  clearInputValidity();
  renderEmpty("Selecciona un campeón en cada rol.");
  setStatus("Selección limpia");
}

async function loadChampionMeta() {
  try {
    const versionsResponse = await fetch(DDragonVersionsURL);
    const versions = await versionsResponse.json();
    const version = Array.isArray(versions) && versions.length ? versions[0] : null;
    if (!version) throw new Error("No se encontró versión de Data Dragon");

    const response = await fetch(DDragonChampionDataURL(version));
    const payload = await response.json();
    const data = Object.values(payload?.data || {});

    championMeta = new Map(
      data.map((champ) => {
        const name = String(champ?.name || "").trim();
        const id = String(champ?.id || "").trim();
        return [
          normalizeText(name),
          {
            name,
            id,
            iconUrl: DDragonIconURL(version, id),
          },
        ];
      })
    );
  } catch {
    championMeta = new Map();
  }
}

async function loadWorkbook() {
  for (const url of WORKBOOK_URLS) {
    try {
      if (typeof XLSX === "undefined") {
        throw new Error("No se pudo cargar la librería XLSX");
      }

      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const buffer = await response.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });

      const roles = {};
      for (const [roleKey, sheetName] of Object.entries(SHEET_MAP)) {
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) {
          throw new Error(`Falta la hoja ${sheetName}`);
        }

        const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        roles[roleKey] = rows
          .map((row) => ({
            champion: String(row["Campeón"] || "").trim(),
            identity: String(row["Identidad"] || "").trim(),
            function: String(row["Función"] || "").trim(),
            tempo: String(row["Ritmo"] || "").trim(),
            strengths: String(row["Fortalezas"] || "").trim(),
            weaknesses: String(row["Debilidades"] || "").trim(),
          }))
          .filter((row) => row.champion);
      }

      draftData = { roles };
      workbookReady = true;
      renderChampionOptions();
      setStatus("Base cargada");
      scheduleAnalyze();
      return;
    } catch (error) {
      console.warn(`No se pudo cargar el workbook desde ${url}:`, error);
    }
  }

  draftData = null;
  workbookReady = false;
  renderChampionOptions();
  setStatus("Sin base");
  renderEmpty("No se ha podido leer el Excel.");
}

function bindPickers() {
  for (const role of ROLE_FIELDS) {
    const input = roleInput(role.key);
    if (!input) continue;

    input.addEventListener("focus", () => openRoleMenu(role.key));
    input.addEventListener("click", () => openRoleMenu(role.key));
    input.addEventListener("input", () => {
      openRoleMenu(role.key);
      scheduleAnalyze();
    });
    input.addEventListener("change", scheduleAnalyze);
    input.addEventListener("keydown", (event) => {
      const currentMenu = roleMenu(role.key);
      const currentState = menuState.get(role.key) || { activeIndex: 0 };
      const items = currentMenu ? getMenuItems(currentMenu) : [];

      if (event.key === "Escape") {
        event.preventDefault();
        closeRoleMenu(role.key);
        return;
      }

      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        if (!currentMenu || currentMenu.hidden) {
          openRoleMenu(role.key);
          return;
        }
        if (!items.length) return;
        const direction = event.key === "ArrowDown" ? 1 : -1;
        const nextIndex = (currentState.activeIndex + direction + items.length) % items.length;
        setMenuActiveIndex(role.key, nextIndex);
        return;
      }

      if (event.key === "Enter") {
        if (currentMenu && !currentMenu.hidden && items.length) {
          event.preventDefault();
          const index = Math.max(0, Math.min(currentState.activeIndex || 0, items.length - 1));
          const activeItem = items[index];
          const championName = activeItem?.getAttribute("data-champion");
          if (championName) selectChampion(role.key, championName);
        }
        return;
      }

      if (event.key === "Tab") {
        closeRoleMenu(role.key);
      }
    });
  }

  document.addEventListener("pointerdown", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const item = target.closest(".picker-item");
    if (item) {
      const roleKey = item.getAttribute("data-role");
      const championName = item.getAttribute("data-champion");
      if (roleKey && championName) selectChampion(roleKey, championName);
      return;
    }

    const clickedPicker = target.closest(".picker-shell");
    const clickedMenu = target.closest(".picker-menu");
    if (!clickedPicker && !clickedMenu) closeAllMenus();
  });
}

function bindViewportListeners() {
  window.addEventListener("resize", schedulePositionActiveMenu, { passive: true });
  window.addEventListener("orientationchange", schedulePositionActiveMenu, { passive: true });
  window.addEventListener("scroll", schedulePositionActiveMenu, { passive: true, capture: true });
}

function schedulePositionActiveMenu() {
  if (!activeRoleKey) return;
  if (viewportUpdateQueued) return;
  viewportUpdateQueued = true;
  window.requestAnimationFrame(() => {
    viewportUpdateQueued = false;
    positionRoleMenu(activeRoleKey);
  });
}

portalizeMenus();
bindPickers();
bindViewportListeners();

els.analyzeBtn.addEventListener("click", analyze);
els.demoBtn.addEventListener("click", clearSelection);

renderNeedMoreData();
loadChampionMeta();
loadWorkbook();
