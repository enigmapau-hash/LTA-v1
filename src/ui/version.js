(() => {
  const badge = document.getElementById("versionBadge");
  const panel = document.getElementById("versionPanel");
  if (!badge || !panel) return;

  const fallback = {
    version: "v1.12.0",
    track: "Identidad del producto",
    label: "Versión",
    updated: "2026-10-10",
    summary: ["Identidad propia para League Team Analyzer"],
    pending: [],
  };

  function render(data) {
    const current = {
      ...fallback,
      ...(data || {}),
      summary: Array.isArray(data?.summary) ? data.summary : fallback.summary,
      pending: Array.isArray(data?.pending) ? data.pending : fallback.pending,
    };

    badge.querySelector(".version-badge__version").textContent = current.version;
    badge.querySelector(".version-badge__label").textContent = current.label;

    panel.innerHTML = `
      <div class="version-panel__title">
        <h2>${current.version}</h2>
        <p class="version-panel__meta">${current.track}</p>
      </div>
      ${current.updated ? `<p class="version-panel__meta">Actualizado: ${current.updated}</p>` : ""}
      ${
        current.summary.length
          ? `
      <div class="version-panel__section">
        <h3>Hecho</h3>
        <ul>${current.summary.map((item) => `<li>${item}</li>`).join("")}</ul>
      </div>
    `
          : ""
      }
      ${
        current.pending.length
          ? `
      <div class="version-panel__section">
        <h3>Pendiente</h3>
        <ul>${current.pending.map((item) => `<li>${item}</li>`).join("")}</ul>
      </div>
    `
          : ""
      }
      <button class="version-panel__close" type="button" data-close-version-panel>Cerrar</button>
    `;
  }

  function setOpen(isOpen) {
    badge.setAttribute("aria-expanded", isOpen ? "true" : "false");
    panel.hidden = !isOpen;
  }

  async function loadVersion() {
    try {
      const response = await fetch("version.json", { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      render(data || fallback);
    } catch {
      render(fallback);
    }
  }

  badge.addEventListener("click", () => setOpen(panel.hidden));
  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.closest("[data-close-version-panel]")) {
      setOpen(false);
      return;
    }
    if (panel.hidden) return;
    if (target === badge || badge.contains(target) || panel.contains(target)) return;
    setOpen(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.hidden) setOpen(false);
  });

  panel.hidden = true;
  setOpen(false);
  loadVersion();
})();
