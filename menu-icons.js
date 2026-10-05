(() => {
  const utils = window.LTAUtils || {};
  const normalizeText = utils.normalizeText;
  const escapeHtml = utils.escapeHtml;
  if (typeof normalizeText !== "function" || typeof escapeHtml !== "function") return;

  const DDragonVersionsURL = "https://ddragon.leagueoflegends.com/api/versions.json";
  const DDragonChampionDataURL = (version) =>
    `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`;
  const DDragonIconURL = (version, id) =>
    `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${id}.png`;

  const championMeta = new Map();
  let refreshQueued = false;

  function getMeta(championName) {
    return championMeta.get(normalizeText(championName)) || null;
  }

  function decorateItem(item) {
    if (!(item instanceof HTMLElement)) return;
    if (!item.classList.contains("picker-item")) return;
    if (item.dataset.menuIconsDecorated === "true") return;

    const championName = item.getAttribute("data-champion") || "";
    const meta = getMeta(championName);
    const label = item.querySelector(".picker-name")?.textContent?.trim() || championName.trim();

    const iconMarkup = meta
      ? `<img class="picker-item__icon" src="${escapeHtml(meta.iconUrl)}" alt="" loading="lazy" />`
      : `<span class="picker-item__icon placeholder" aria-hidden="true">${escapeHtml(
          label.slice(0, 2).toUpperCase() || "?"
        )}</span>`;

    item.insertAdjacentHTML(
      "afterbegin",
      `\n        ${iconMarkup}\n        <span class="picker-item__label">${escapeHtml(label)}</span>\n      `
    );

    const name = item.querySelector(".picker-name");
    if (name) name.remove();
    item.dataset.menuIconsDecorated = "true";
  }

  function refreshMenus() {
    const items = document.querySelectorAll(".picker-menu .picker-item");
    for (const item of items) decorateItem(item);
  }

  function scheduleRefresh() {
    if (refreshQueued) return;
    refreshQueued = true;
    window.requestAnimationFrame(() => {
      refreshQueued = false;
      refreshMenus();
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
      refreshMenus();
    }
  }

  function observeDom() {
    const observer = new MutationObserver(() => scheduleRefresh());
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["hidden", "class", "style"],
    });
  }

  function init() {
    scheduleRefresh();
    observeDom();
    loadMeta();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
