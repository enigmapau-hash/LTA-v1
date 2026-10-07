(() => {
  function render({ container, comp, roles, findRoleRow, getChampionMeta, escapeHtml }) {
    const rows = roles.map((role) => {
      const valueKey = role.key === "botline" ? "adc" : role.key;
      const champion = comp[valueKey];
      const data = findRoleRow(role.key, champion);
      const meta = champion ? getChampionMeta(champion) : null;
      const missing = Boolean(champion) && !data;
      const unknown = Boolean(champion) && !findRoleRow(role.key, champion);

      const iconMarkup = meta
        ? `<img class="champion-icon" src="${escapeHtml(meta.iconUrl)}" alt="" loading="lazy" />`
        : `<div class="champion-icon placeholder" aria-hidden="true">${escapeHtml(
            champion ? champion.slice(0, 2).toUpperCase() : "—"
          )}</div>`;

      return `
        <tr class="${missing ? "is-missing" : ""} ${unknown ? "is-unknown" : ""}">
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
    `;
  }

  window.LTACompositionReport = Object.freeze({ render });
})();
