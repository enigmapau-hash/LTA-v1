(() => {
  function renderRecommendations(recommendations, roles, escapeHtml) {
    const roleCards = Object.entries(recommendations || {}).filter(([, items]) => items?.length);
    if (!roleCards.length) return "";

    return `
      <section class="pick-recommendations" aria-labelledby="pick-recommendations-title">
        <div class="pick-recommendations__heading">
          <p class="result-summary__eyebrow">Composición incompleta</p>
          <h3 id="pick-recommendations-title">Candidatos por rol</h3>
        </div>
        <div class="pick-recommendations__grid">
          ${roleCards.map(([role, items]) => `
            <article class="pick-recommendations__role">
              <h4>${escapeHtml(roles.find((item) => item.key === role)?.label || role)}</h4>
              <ol>
                ${items.map((item) => `
                  <li>
                    <strong>${escapeHtml(item.champion)}</strong>
                    <span class="pick-recommendations__quality${item.quality === "Mejor afinidad" ? " is-best" : ""}">${escapeHtml(item.quality)}</span>
                    <small>${escapeHtml(item.direction || "Sin identidad clara")} · Afinidad ${item.affinity}/100</small>
                    <small>Aporta: ${escapeHtml(item.strengths.join(", ") || "sin señales suficientes")}</small>
                  </li>
                `).join("")}
              </ol>
              ${renderRolePlans(items, escapeHtml)}
            </article>
          `).join("")}
        </div>
      </section>
    `;
  }

  function renderRolePlans(items, escapeHtml) {
    const plans = new Map();
    for (const item of items) {
      const steps = item.gamePlan || [];
      const key = JSON.stringify([item.direction, steps]);
      if (!item.direction || !steps.length || plans.has(key)) continue;
      plans.set(key, { direction: item.direction, steps });
    }
    if (!plans.size) return "";

    return `
      <div class="pick-recommendations__plans">
        <p>Plan asociado</p>
        <ul>${[...plans.values()].map(({ direction, steps }) => `
          <li><strong>${escapeHtml(direction)}:</strong> ${steps.map(escapeHtml).join(" ")}</li>
        `).join("")}</ul>
      </div>
    `;
  }

  function render({ container, comp, roles, findRoleRow, getChampionMeta, escapeHtml, recommendations }) {
    const complete = roles.every((role) => {
      const valueKey = role.key === "botline" ? "adc" : role.key;
      const champion = comp[valueKey];
      return Boolean(champion) && Boolean(findRoleRow(role.key, champion));
    });

    const rows = roles.map((role) => {
      const valueKey = role.key === "botline" ? "adc" : role.key;
      const champion = comp[valueKey];
      const data = findRoleRow(role.key, champion);
      const meta = champion ? getChampionMeta(champion) : null;
      const notFound = Boolean(champion) && !data;

      const iconMarkup = meta
        ? `<img class="champion-icon" src="${escapeHtml(meta.iconUrl)}" alt="" loading="lazy" />`
        : `<div class="champion-icon placeholder" aria-hidden="true">${escapeHtml(
            champion ? champion.slice(0, 2).toUpperCase() : "—"
          )}</div>`;

      return `
        <tr
          class="${notFound ? "is-missing is-unknown" : ""}"
          data-identity="${escapeHtml(data?.identity || "")}"
          data-function="${escapeHtml(data?.function || "")}"
          data-tempo="${escapeHtml(data?.tempo || "")}"
          data-strengths="${escapeHtml(data?.strengths || "")}"
          data-weaknesses="${escapeHtml(data?.weaknesses || "")}"
        >
          <td data-label="Rol" class="role-cell">${escapeHtml(role.label)}</td>
          <td data-label="Campeón">
            <div class="champion-cell">
              ${iconMarkup}
              <div class="champion-copy">
                <div class="champion-name">${escapeHtml(champion || "—")}</div>
                ${meta?.id ? `<div class="champion-sub">${escapeHtml(meta.id)}</div>` : ""}
              </div>
            </div>
          </td>
          ${complete ? "" : `<td data-label="Identidad">${escapeHtml(data?.identity || (champion ? "No encontrado" : ""))}</td>`}
          <td data-label="Función">${escapeHtml(data?.function || "")}</td>
          <td data-label="Ritmo">${escapeHtml(data?.tempo || "")}</td>
          ${complete ? "" : `<td data-label="Fortalezas">${escapeHtml(data?.strengths || "")}</td>`}
          ${complete ? "" : `<td data-label="Debilidades">${escapeHtml(data?.weaknesses || "")}</td>`}
        </tr>
      `;
    }).join("");

    container.className = "result-box";
    container.innerHTML = `
      <div class="table-wrap">
        <table class="composition-table${complete ? " is-complete" : ""}">
          ${complete ? "<caption>Composición</caption>" : ""}
          <thead>
            <tr>
              <th>Rol</th>
              <th>Campeón</th>
              ${complete ? "" : "<th>Identidad</th>"}
              <th>Función</th>
              <th>Ritmo</th>
              ${complete ? "" : "<th>Fortalezas</th>"}
              ${complete ? "" : "<th>Debilidades</th>"}
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      ${renderRecommendations(recommendations, roles, escapeHtml)}
    `;
  }

  window.LTACompositionReport = Object.freeze({ render });
})();
