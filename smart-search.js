(() => {
  const normalizeText = window.LTAUtils?.normalizeText;
  if (typeof normalizeText !== "function") return;

  const compact = (value) => normalizeText(value).replace(/[^a-z0-9]/g, "");
  const acronym = (value) =>
    normalizeText(value)
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join("");

  const isSubsequence = (query, target) => {
    if (!query) return true;
    let qi = 0;
    for (const char of target) {
      if (char === query[qi]) {
        qi += 1;
        if (qi >= query.length) return true;
      }
    }
    return false;
  };

  const scoreChampion = (query, name) => {
    const q = compact(query);
    const target = compact(name);
    const targetAcronym = acronym(name).replace(/[^a-z0-9]/g, "");

    if (!q) return { matched: true, score: 0 };
    if (!target) return { matched: false, score: -1 };
    if (target === q) return { matched: true, score: 100 };
    if (target.startsWith(q)) return { matched: true, score: 95 };
    if (targetAcronym === q) return { matched: true, score: 94 };
    if (targetAcronym.startsWith(q)) return { matched: true, score: 92 };
    if (target.includes(q)) return { matched: true, score: 90 - Math.min(target.indexOf(q), 20) / 100 };
    if (isSubsequence(q, targetAcronym)) return { matched: true, score: 88 };
    if (isSubsequence(q, target)) return { matched: true, score: 80 };
    return { matched: false, score: -1 };
  };

  const originalRenderRoleMenu = typeof renderRoleMenu === "function" ? renderRoleMenu : null;

  function renderRoleMenuSmart(roleKey, query = "") {
    const menu = roleMenu(roleKey);
    const input = roleInput(roleKey);
    if (!menu || !input) return;

    const allNames = draftData ? buildChampionList(roleKey) : [];
    const normalizedQuery = normalizeText(query);

    const ranked = normalizedQuery
      ? allNames
          .map((name) => ({ name, ...scoreChampion(normalizedQuery, name) }))
          .filter((item) => item.matched)
          .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "es"))
      : allNames.map((name) => ({ name, score: 0 }));

    const items = ranked.slice(0, 60);
    menu.innerHTML = items.length
      ? items
          .map((item, index) => {
            const itemId = `${menu.id}-option-${index}`;
            return `
              <button
                type="button"
                id="${itemId}"
                class="picker-item${index === 0 ? " is-active" : ""}"
                role="option"
                aria-selected="${index === 0 ? "true" : "false"}"
                data-role="${escapeHtml(roleKey)}"
                data-champion="${escapeHtml(item.name)}"
              >
                <span class="picker-name">${escapeHtml(item.name)}</span>
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

  renderRoleMenu = renderRoleMenuSmart;

  if (originalRenderRoleMenu && originalRenderRoleMenu !== renderRoleMenuSmart) {
    window.requestAnimationFrame(() => {
      if (activeRoleKey) {
        renderRoleMenuSmart(activeRoleKey, roleInput(activeRoleKey)?.value || "");
      }
    });
  }
})();