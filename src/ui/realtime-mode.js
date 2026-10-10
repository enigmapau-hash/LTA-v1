(() => {
  const subtitle = document.querySelector(".form-card .card-head p");
  if (subtitle) {
    subtitle.textContent = "Elige un campeón para cada posición.";
  }

  const statusPill = document.getElementById("statusPill");
  if (statusPill && statusPill.textContent.trim() === "Listo") {
    statusPill.textContent = "Análisis actualizado";
  }
})();
