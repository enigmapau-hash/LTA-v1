(() => {
  const roles = [
    { key: "top", inputId: "top", menuId: "topMenu" },
    { key: "jungle", inputId: "jungle", menuId: "jungleMenu" },
    { key: "mid", inputId: "mid", menuId: "midMenu" },
    { key: "botline", inputId: "adc", menuId: "botlineMenu" },
    { key: "support", inputId: "support", menuId: "supportMenu" },
  ];

  const normalize = (value) =>
    String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[\"'`´’]/g, "")
      .trim()
      .toLowerCase();

  const getInput = (role) => document.getElementById(role.inputId);
  const getMenu = (role) => document.getElementById(role.menuId);

  function getBlockedChampions(currentRoleKey) {
    const blocked = new Set();

    for (const role of roles) {
      if (role.key === currentRoleKey) continue;
      const input = getInput(role);
      const champion = normalize(input?.value);
      if (champion) blocked.add(champion);
    }

    return blocked;
  }

  function refreshMenu(role) {
    const menu = getMenu(role);
    if (!menu || menu.hidden) return;

    const blocked = getBlockedChampions(role.key);
    const items = Array.from(menu.querySelectorAll(".picker-item"));

    for (const item of items) {
      const champion = normalize(item.getAttribute("data-champion"));
      if (champion && blocked.has(champion)) {
        item.remove();
      }
    }

    const remainingItems = Array.from(menu.querySelectorAll(".picker-item"));
    remainingItems.forEach((item, index) => {
      const isActive = index === 0;
      item.classList.toggle("is-active", isActive);
      item.setAttribute("aria-selected", isActive ? "true" : "false");
    });
  }

  function refreshAllMenus() {
    for (const role of roles) {
      refreshMenu(role);
    }
  }

  function scheduleRefresh() {
    window.requestAnimationFrame(refreshAllMenus);
  }

  function bindInputs() {
    for (const role of roles) {
      const input = getInput(role);
      if (!input) continue;
      input.addEventListener("input", scheduleRefresh, { passive: true });
      input.addEventListener("focus", scheduleRefresh, { passive: true });
      input.addEventListener("click", scheduleRefresh, { passive: true });
      input.addEventListener("change", scheduleRefresh, { passive: true });
    }
  }

  function observeMenus() {
    const observer = new MutationObserver(() => scheduleRefresh());
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["hidden", "style"],
    });
  }

  bindInputs();
  observeMenus();
  scheduleRefresh();
})();
