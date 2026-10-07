(() => {
  const subtitle = document.querySelector(".form-card .card-head p");
  if (subtitle) {
    subtitle.textContent = "Se actualiza automáticamente al escribir.";
  }

  const statusPill = document.getElementById("statusPill");
  if (statusPill && statusPill.textContent.trim() === "Listo") {
    statusPill.textContent = "Tiempo real";
  }
})();
