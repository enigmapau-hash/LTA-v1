(() => {
  const normalizeText = window.LTAUtils?.normalizeText;
  if (typeof normalizeText !== "function") return;

  function roleRows(draftData, roleKey) {
    return draftData?.roles?.[roleKey] || [];
  }

  function buildChampionList(draftData, roleKey) {
    const champions = new Set();
    for (const row of roleRows(draftData, roleKey)) {
      if (row?.champion) champions.add(row.champion);
    }
    return [...champions].sort((a, b) => a.localeCompare(b, "es"));
  }

  function findRoleRow(draftData, roleKey, championName) {
    const rows = roleRows(draftData, roleKey);
    if (!Array.isArray(rows) || !championName) return null;
    const target = normalizeText(championName);
    return rows.find((row) => normalizeText(row?.champion) === target) || null;
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

  function firstInvalidRole(comp, roleFields, findRow) {
    for (const role of roleFields) {
      const champion = comp[role.key === "botline" ? "adc" : role.key];
      if (champion && !findRow(role.key, champion)) {
        return { role: role.key, champion };
      }
    }
    return null;
  }

  window.LTACompositionLogic = Object.freeze({
    buildChampionList,
    findDuplicateChampion,
    findRoleRow,
    firstInvalidRole,
  });
})();
