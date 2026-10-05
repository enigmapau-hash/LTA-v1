(() => {
  const result = document.getElementById("result");
  if (!result) return;

  const splitList = window.LTAUtils?.splitList;
  if (typeof splitList !== "function") return;

  let refreshQueued = false;

  const text = (node) => node?.textContent?.trim() || "";

  function clearSummary() {
    delete result.dataset.summarySignature;
    result.querySelector(".result-summary")?.remove();
  }

  function normalizeLabel(value) {
    return String(value || "").trim().replace(/\s+/g, " ");
  }

  function topCounts(map, limit = 3) {
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es"))
      .slice(0, limit)
      .map(([label, count]) => ({ label, count }));
  }

  function buildSummary() {
    const table = result.querySelector(".composition-table");
    if (!table) {
      clearSummary();
      return;
    }

    const rows = Array.from(table.querySelectorAll("tbody tr"));
    if (!rows.length) {
      clearSummary();
      return;
    }

    const items = rows.map((row) => {
      const role = text(row.querySelector('[data-label="Rol"]'));
      const champion = text(row.querySelector('[data-label="Campeón"] .champion-name'));
      const identity = text(row.querySelector('[data-label="Identidad"]'));
      const functionLabel = text(row.querySelector('[data-label="Función"]'));
      const tempo = text(row.querySelector('[data-label="Ritmo"]'));
      const strengths = text(row.querySelector('[data-label="Fortalezas"]'));
      const weaknesses = text(row.querySelector('[data-label="Debilidades"]'));
      const missing = row.classList.contains("is-missing");
      const unknown = row.classList.contains("is-unknown");
      const icon = row.querySelector(".champion-icon")?.outerHTML || "";
      return { role, champion, identity, functionLabel, tempo, strengths, weaknesses, missing, unknown, icon };
    });

    const signature = items
      .map((item) => [item.role, item.champion, item.identity, item.functionLabel, item.tempo, item.strengths, item.weaknesses, item.missing, item.unknown].join("|"))
      .join(";");

    if (result.dataset.summarySignature === signature) return;
    result.dataset.summarySignature = signature;

    result.querySelector(".result-summary")?.remove();

    const completed = items.filter((item) => item.champion && item.champion !== "—" && !item.missing).length;
    const problems = items.filter((item) => item.missing || item.unknown || !item.champion || item.champion === "—").length;
    const ready = problems === 0;

    const identityCounts = new Map();
    const functionCounts = new Map();
    const tempoCounts = new Map();
    const strengthCounts = new Map();
    const weaknessCounts = new Map();

    for (const item of items) {
      for (const label of splitList(item.identity)) {
        const key = normalizeLabel(label);
        if (!key) continue;
        identityCounts.set(key, (identityCounts.get(key) || 0) + 1);
      }
      for (const label of splitList(item.functionLabel)) {
        const key = normalizeLabel(label);
        if (!key) continue;
        functionCounts.set(key, (functionCounts.get(key) || 0) + 1);
      }
      for (const label of splitList(item.tempo)) {
        const key = normalizeLabel(label);
        if (!key) continue;
        tempoCounts.set(key, (tempoCounts.get(key) || 0) + 1);
      }
      for (const label of splitList(item.strengths)) {
        const key = normalizeLabel(label);
        if (!key) continue;
        strengthCounts.set(key, (strengthCounts.get(key) || 0) + 1);
      }
      for (const label of splitList(item.weaknesses)) {
        const key = normalizeLabel(label);
        if (!key) continue;
        weaknessCounts.set(key, (weaknessCounts.get(key) || 0) + 1);
      }
    }

    const identityTop = topCounts(identityCounts, 2);
    const functionTop = topCounts(functionCounts, 2);
    const tempoTop = topCounts(tempoCounts, 2);
    const strengthTop = topCounts(strengthCounts, 2);
    const weaknessTop = topCounts(weaknessCounts, 2);
    const globalPreview = [identityTop[0]?.label, functionTop[0]?.label, tempoTop[0]?.label].filter(Boolean).join(" · ");

    const summary = document.createElement("section");
    summary.className = `result-summary${ready ? " is-ready" : " is-pending"}`;
    summary.innerHTML = `
      <div class="result-summary__header">
        <div>
          <p class="result-summary__eyebrow">Vista rápida</p>
          <h3>${ready ? "Composición lista" : "Composición en revisión"}</h3>
          <p class="result-summary__subhead">${completed}/5 campeones detectados · ${problems} incidencias</p>
        </div>
        <div class="result-summary__stats">
          <span class="result-summary__stat">
            <strong>${completed}/5</strong>
            <small>Campeones</small>
          </span>
          <span class="result-summary__stat${ready ? " is-good" : " is-warning"}">
            <strong>${ready ? "OK" : problems}</strong>
            <small>${ready ? "Sin errores" : "Revisar"}</small>
          </span>
        </div>
      </div>

      <details class="result-summary__global ${ready ? "is-ready" : "is-pending"}"${ready ? "" : " open"}>
        <summary class="result-summary__global-summary">
          <div>
            <p class="result-summary__eyebrow">Sinergia global</p>
            <h4>${ready ? "Resumen compacto" : "Ayuda para completar"}</h4>
            <p class="result-summary__global-note">${globalPreview || "Lectura compacta de identidades, funciones y ritmo."}</p>
          </div>
          <span class="result-summary__global-toggle">${ready ? "Ver detalle" : "Ocultar ayuda"}</span>
        </summary>

        <div class="result-summary__global-body">
          <div class="result-summary__chip-row">
            ${identityTop.length ? identityTop.map((item) => `<span class="result-summary__chip"><strong>${item.label}</strong><small>${item.count}</small></span>`).join("") : `<span class="result-summary__chip is-empty">Sin identidad</span>`}
            ${functionTop.length ? functionTop.map((item) => `<span class="result-summary__chip"><strong>${item.label}</strong><small>${item.count}</small></span>`).join("") : `<span class="result-summary__chip is-empty">Sin función</span>`}
            ${tempoTop.length ? tempoTop.map((item) => `<span class="result-summary__chip"><strong>${item.label}</strong><small>${item.count}</small></span>`).join("") : `<span class="result-summary__chip is-empty">Sin ritmo</span>`}
          </div>

          <div class="result-summary__mini-grid">
            <div class="result-summary__mini-card">
              <span>Fortalezas destacadas</span>
              <strong>${strengthTop.length ? strengthTop.map((item) => item.label).join(" · ") : ready ? "Sin datos" : "Pendiente"}</strong>
            </div>
            <div class="result-summary__mini-card">
              <span>Debilidades visibles</span>
              <strong>${weaknessTop.length ? weaknessTop.map((item) => item.label).join(" · ") : ready ? "Sin datos" : "Pendiente"}</strong>
            </div>
          </div>
        </div>
      </details>

      <div class="result-summary__roles">
        ${items
          .map((item) => {
            const status = item.missing || item.unknown || !item.champion || item.champion === "—" ? "is-issue" : "is-ok";
            const champion = item.champion || "—";
            const identity = item.identity || (ready ? "Listo" : "Pendiente");
            const functionLabel = item.functionLabel || (ready ? "Listo" : "Pendiente");
            const icon = item.icon || `<span class="result-summary__icon placeholder" aria-hidden="true">${champion.slice(0, 2).toUpperCase()}</span>`;
            return `
              <article class="result-summary__role ${status}">
                <div class="result-summary__role-icon">${icon}</div>
                <div class="result-summary__role-copy">
                  <span class="result-summary__role-label">${item.role || "Rol"}</span>
                  <strong>${champion}</strong>
                  <div class="result-summary__role-meta">
                    <small><span class="result-summary__role-k">Identidad</span>${identity}</small>
                    <small><span class="result-summary__role-k">Función</span>${functionLabel}</small>
                  </div>
                </div>
              </article>
            `;
          })
          .join("")}
      </div>
    `;

    table.parentElement?.insertBefore(summary, table);
  }

  function scheduleBuild() {
    if (refreshQueued) return;
    refreshQueued = true;
    window.requestAnimationFrame(() => {
      refreshQueued = false;
      buildSummary();
    });
  }

  const observer = new MutationObserver(scheduleBuild);
  observer.observe(result, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class"],
  });

  scheduleBuild();
})();
