(() => {
  const result = document.getElementById("result");
  if (!result) return;

  const splitList = window.LTAUtils?.splitList;
  const escapeHtml = window.LTAUtils?.escapeHtml || ((value) => String(value));
  const analyzeComposition = window.LTACompositionEngine?.analyzeComposition;
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

  function renderList(items, emptyText = "Sin datos disponibles.") {
    if (!items?.length) return `<p class="result-summary__empty">${escapeHtml(emptyText)}</p>`;
    return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
  }

  function renderStrategicReport(items) {
    if (typeof analyzeComposition !== "function") return "";
    const analysis = analyzeComposition(items.map((item) => ({
      role: item.role,
      champion: item.champion,
      identity: item.identity,
      function: item.functionLabel,
      tempo: item.tempo,
      strengths: item.strengths,
      weaknesses: item.weaknesses,
    })));
    const report = analysis.report;
    const hasIdentity = Boolean(analysis.identity.primary);
    const identity = [analysis.identity.primary, analysis.identity.secondary]
      .filter(Boolean)
      .map(escapeHtml)
      .join(" · ") || "Sin identidad clara";
    const howToPlay = report.gamePlan?.length ? report.gamePlan : report.winCondition ? [report.winCondition] : [];
    const risks = [...new Set([...(report.weaknesses || []), ...(report.risks || [])])];

    return `
      <section class="result-summary__strategy" aria-labelledby="composition-analysis-title">
        <div class="result-summary__strategy-heading">
          <p class="result-summary__eyebrow">Análisis estratégico</p>
          <h3 id="composition-analysis-title">${identity}</h3>
          ${hasIdentity ? "" : `<p>${escapeHtml(report.executiveSummary)}</p>`}
        </div>
        <div class="result-summary__strategy-grid">
          <article class="result-summary__strategy-card">
            <h4>Cómo jugarla</h4>
            ${renderList(howToPlay, "No hay un plan común definido.")}
          </article>
          <article class="result-summary__strategy-card">
            <h4>Fortalezas</h4>
            ${renderList(report.strengths, "No se identifican fortalezas compartidas suficientes.")}
          </article>
          <article class="result-summary__strategy-card">
            <h4>Riesgos</h4>
            ${renderList(risks, "No se han detectado riesgos principales.")}
          </article>
        </div>
      </section>
    `;
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
    }

    const identityTop = topCounts(identityCounts, 2);
    const functionTop = topCounts(functionCounts, 2);
    const tempoTop = topCounts(tempoCounts, 2);
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

      ${ready ? "" : `<details class="result-summary__global is-pending" open>
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

        </div>
      </details>`}

      ${ready ? renderStrategicReport(items) : ""}

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
