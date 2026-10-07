const ROLE_FIELDS = [
  { key: "top", label: "TOP", inputId: "top", menuId: "topMenu" },
  { key: "jungle", label: "JUNGLA", inputId: "jungle", menuId: "jungleMenu" },
  { key: "mid", label: "MID", inputId: "mid", menuId: "midMenu" },
  { key: "botline", label: "BOTLINE", inputId: "adc", menuId: "botlineMenu" },
  { key: "support", label: "SUPPORT", inputId: "support", menuId: "supportMenu" },
];

const { normalizeText, escapeHtml } = window.LTAUtils;

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
  els.demoBtn.disabled = isBusy;
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

function buildChampionList(roleKey) {
  return window.LTACompositionLogic.buildChampionList(draftData, roleKey);
}

function getChampionMeta(name) {
  return championMeta.get(normalizeText(name)) || null;
}

function findRoleRow(roleKey, championName) {
  return window.LTACompositionLogic.findRoleRow(draftData, roleKey, championName);
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
  window.LTACompositionReport.render({
    container: els.result,
    comp,
    roles: ROLE_FIELDS,
    findRoleRow,
    getChampionMeta,
    escapeHtml,
  });
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

  const duplicate = window.LTACompositionLogic.findDuplicateChampion(comp);
  if (duplicate) {
    markDuplicateInputs(duplicate);
    renderEmpty(`No repitas campeones. Corrige ${escapeHtml(duplicate)}.`);
    setStatus("Campeón repetido");
    return;
  }

  clearInputValidity();
  const invalidRole = window.LTACompositionLogic.firstInvalidRole(comp, ROLE_FIELDS, findRoleRow);
  if (invalidRole) {
    const input = roleInput(invalidRole.role);
    setInputValidity(input, true);
    renderComposition(comp);
    setStatus(`${invalidRole.champion} no está en la lista de ${ROLE_FIELDS.find((role) => role.key === invalidRole.role)?.label || invalidRole.role}.`);
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
  championMeta = await window.LTAChampionMetadata.loadChampionMeta();
}

async function loadWorkbook() {
  draftData = await window.LTAWorkbookReader.loadWorkbook();
  workbookReady = Boolean(draftData);
  if (!workbookReady) {
    renderChampionOptions();
    setStatus("Sin base");
    renderEmpty("No se pudo cargar la base de campeones (Draft Pool.xlsx).");
    return;
  }

  renderChampionOptions();
  setStatus("Base cargada");
  scheduleAnalyze();
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

els.demoBtn.addEventListener("click", clearSelection);

renderNeedMoreData();
loadChampionMeta();
loadWorkbook();
