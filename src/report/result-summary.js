(() => {
  const result = document.getElementById("result");
  if (!result) return;

  const escapeHtml = window.LTAUtils?.escapeHtml || ((value) => String(value));
  const analyzeComposition = window.LTACompositionEngine?.analyzeComposition;

  let refreshQueued = false;

  const text = (node) => node?.textContent?.trim() || "";

  function clearSummary() {
    delete result.dataset.summarySignature;
    result.querySelector(".result-summary")?.remove();
  }

  function renderList(items, emptyText = "No hay información para mostrar.") {
    if (!items?.length) return `<p class="result-summary__empty">${escapeHtml(emptyText)}</p>`;
    return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
  }

  function renderPlanSupport(planSupport) {
    if (!planSupport) return "";
    const strongest = planSupport.strongestPicks;
    const strongestPicks = strongest.map((pick) => pick.champion).join(", ");
    const scoreLoss = strongest[0]?.scoreLoss || 0;
    const support = strongestPicks
      ? `<p><strong>${strongest.length > 1 ? "Piezas clave" : "Pieza clave"}:</strong> ${escapeHtml(strongestPicks)} (−${scoreLoss} puntos de ajuste ${strongest.length > 1 ? "si falta cualquiera" : "si falta"}).</p>`
      : "";
    const changes = new Map();
    for (const item of planSupport.identityChanges) {
      const identity = item.identityWithout || "sin identidad clara";
      const gamePlan = item.gamePlanWithout?.join(" ") || "";
      const key = JSON.stringify([identity, gamePlan]);
      const group = changes.get(key) || { identity, gamePlan, champions: [] };
      group.champions.push(item.champion);
      changes.set(key, group);
    }
    const fragility = changes.size
      ? [...changes.values()].map(({ identity, gamePlan, champions }) =>
        identity === "sin identidad clara"
          ? `<li>Si falta ${escapeHtml(champions.join(", "))}, el equipo pierde una identidad principal clara.</li>`
          : `<li>Si falta ${escapeHtml(champions.join(", "))}, el plan cambia a ${escapeHtml(identity)}: ${escapeHtml(gamePlan)}</li>`
      ).join("")
      : "";
    const stability = changes.size
      ? `<p><strong>Si falta una pieza:</strong></p><ul>${fragility}</ul>`
      : "<p><strong>Estabilidad:</strong> la identidad se mantiene aunque falte cualquier pick.</p>";
    return `<div class="result-summary__strategy-insight">${support}${stability}</div>`;
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
            <h4>Plan de partida</h4>
            ${renderList(howToPlay, "Aún no hay un plan claro.")}
            ${renderPlanSupport(report.planSupport)}
          </article>
          <article class="result-summary__strategy-card">
            <h4>Fortalezas</h4>
            ${renderList(report.strengths, "No destacan fortalezas comunes.")}
          </article>
          <article class="result-summary__strategy-card">
            <h4>Riesgos</h4>
            ${renderList(risks, "No se aprecian riesgos principales.")}
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
      const identity = row.dataset.identity || text(row.querySelector('[data-label="Identidad"]'));
      const functionLabel = row.dataset.function || text(row.querySelector('[data-label="Función"]'));
      const tempo = row.dataset.tempo || text(row.querySelector('[data-label="Ritmo"]'));
      const strengths = row.dataset.strengths || text(row.querySelector('[data-label="Fortalezas"]'));
      const weaknesses = row.dataset.weaknesses || text(row.querySelector('[data-label="Debilidades"]'));
      const missing = row.classList.contains("is-missing");
      const unknown = row.classList.contains("is-unknown");
      return { role, champion, identity, functionLabel, tempo, strengths, weaknesses, missing, unknown };
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

    const missingRoles = items
      .filter((item) => !item.champion || item.champion === "—")
      .map((item) => item.role);
    const invalidChampions = items
      .filter((item) => item.champion && item.champion !== "—" && (item.missing || item.unknown))
      .map((item) => item.champion);

    const summary = document.createElement("section");
    summary.className = `result-summary${ready ? " is-ready" : " is-pending"}`;
    summary.innerHTML = `
      <div class="result-summary__header">
        <div>
          <p class="result-summary__eyebrow">${ready ? "Equipo completo" : "Composición incompleta"}</p>
          <h3>${ready ? "Composición lista" : "Completa tu equipo"}</h3>
          ${ready ? "" : `<p class="result-summary__subhead">${missingRoles.length
            ? `Faltan: ${missingRoles.map(escapeHtml).join(" · ")}.`
            : `Revisa: ${invalidChampions.map(escapeHtml).join(" · ")}.`}</p>`}
        </div>
        <div class="result-summary__stats">
          <span class="result-summary__stat${ready ? " is-good" : " is-warning"}">
            <strong>${completed}/5</strong>
            <small>Roles elegidos</small>
          </span>
        </div>
      </div>

      ${ready ? renderStrategicReport(items) : ""}
    `;

    const tableSection = table.closest(".table-wrap") || table.parentElement;
    if (ready) {
      tableSection?.after(summary);
    } else {
      tableSection?.before(summary);
    }
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
