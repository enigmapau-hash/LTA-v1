(() => {
  const normalizeText = window.LTAUtils?.normalizeText;
  if (typeof normalizeText !== "function") return;

  const roles = [
    { key: "top", inputId: "top" },
    { key: "jungle", inputId: "jungle" },
    { key: "mid", inputId: "mid" },
    { key: "botline", inputId: "adc" },
    { key: "support", inputId: "support" },
  ];

  const DDragonVersionsURL = "https://ddragon.leagueoflegends.com/api/versions.json";
  const DDragonChampionDataURL = (version) =>
    `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`;
  const DDragonIconURL = (version, id) =>
    `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${id}.png`;

  const championMeta = new Map();
  let refreshQueued = false;

  const getInput = (role) => document.getElementById(role.inputId);

  function renderRole(role) {
    const input = getInput(role);
    if (!input) return;

    const rawValue = input.value.trim();
    const meta = championMeta.get(normalizeText(rawValue)) || null;

    if (!rawValue || !meta?.iconUrl) {
      input.classList.remove("has-selected-champion");
      input.style.removeProperty("--selected-champion-icon");
      return;
    }

    input.classList.add("has-selected-champion");
    input.style.setProperty("--selected-champion-icon", `url("${meta.iconUrl}")`);
  }

  function renderAll() {
    for (const role of roles) {
      renderRole(role);
    }
  }

  function scheduleRender() {
    if (refreshQueued) return;
    refreshQueued = true;
    window.requestAnimationFrame(() => {
      refreshQueued = false;
      renderAll();
    });
  }

  async function loadMeta() {
    try {
      const versionsResponse = await fetch(DDragonVersionsURL, { cache: "no-store" });
      if (!versionsResponse.ok) throw new Error(`HTTP ${versionsResponse.status}`);
      const versions = await versionsResponse.json();
      const version = Array.isArray(versions) && versions.length ? versions[0] : null;
      if (!version) throw new Error("No se encontró versión de Data Dragon");

      const response = await fetch(DDragonChampionDataURL(version), { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      const data = Object.values(payload?.data || {});

      championMeta.clear();
      for (const champ of data) {
        const name = String(champ?.name || "").trim();
        const id = String(champ?.id || "").trim();
        if (!name || !id) continue;
        championMeta.set(normalizeText(name), {
          name,
          id,
          iconUrl: DDragonIconURL(version, id),
        });
      }
    } catch {
      championMeta.clear();
    } finally {
      renderAll();
    }
  }

  function bindInputs() {
    for (const role of roles) {
      const input = getInput(role);
      if (!input) continue;
      input.addEventListener("input", scheduleRender);
      input.addEventListener("change", scheduleRender);
      input.addEventListener("blur", scheduleRender);
    }

    document.addEventListener(
      "pointerdown",
      (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        if (target.closest(".picker-item")) {
          window.requestAnimationFrame(scheduleRender);
        }
      },
      true
    );

    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.closest("#demoBtn") || target.closest(".picker-item")) {
        window.requestAnimationFrame(scheduleRender);
      }
    });
  }

  function init() {
    bindInputs();
    renderAll();
    loadMeta();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
