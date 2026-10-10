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
                    <small>${escapeHtml(item.direction || "Sin identidad clara")} · Afinidad ${item.affinity}/100${item.coherent ? " · plan cohesionado" : " · orientación inicial"}</small>
                    <small>Fortalezas: ${escapeHtml(item.strengths.join(", ") || "sin señales suficientes")}</small>
                    ${item.gamePlan.map((step) => `<small>Plan: ${escapeHtml(step)}</small>`).join("")}
                  </li>
                `).join("")}
              </ol>
            </article>
          `).join("")}
        </div>
      </section>
    `;
  }

  function render({ container, comp, roles, findRoleRow, getChampionMeta, escapeHtml, recommendations }) {
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
        <tr class="${notFound ? "is-missing is-unknown" : ""}">
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
          <td data-label="Identidad">${escapeHtml(data?.identity || (champion ? "No encontrado" : ""))}</td>
          <td data-label="Función">${escapeHtml(data?.function || "")}</td>
          <td data-label="Ritmo">${escapeHtml(data?.tempo || "")}</td>
          <td data-label="Fortalezas">${escapeHtml(data?.strengths || "")}</td>
          <td data-label="Debilidades">${escapeHtml(data?.weaknesses || "")}</td>
        </tr>
      `;
    }).join("");

    container.className = "result-box";
    container.innerHTML = `
      <div class="table-wrap">
        <table class="composition-table">
          <thead>
            <tr>
              <th>Rol</th>
              <th>Campeón</th>
              <th>Identidad</th>
              <th>Función</th>
              <th>Ritmo</th>
              <th>Fortalezas</th>
              <th>Debilidades</th>
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
