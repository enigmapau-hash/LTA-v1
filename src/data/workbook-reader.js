(() => {
  const WORKBOOK_URLS = [
    encodeURI("Draft Pool.xlsx"),
    "https://raw.githubusercontent.com/enigmapau-hash/lol-team-analyzer-v2/main/Draft%20Pool.xlsx",
  ];

  const SHEET_MAP = {
    top: "Tabla Top",
    jungle: "Tabla Jungla",
    mid: "Tabla Mid",
    botline: "Tabla Botline",
    support: "Tabla Support",
  };

  function readRoleRows(workbook, sheetName) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) throw new Error(`Falta la hoja ${sheetName}`);

    return XLSX.utils
      .sheet_to_json(sheet, { defval: "" })
      .map((row) => ({
        champion: String(row["Campeón"] || "").trim(),
        identity: String(row["Identidad"] || "").trim(),
        function: String(row["Función"] || "").trim(),
        tempo: String(row["Ritmo"] || "").trim(),
        strengths: String(row["Fortalezas"] || "").trim(),
        weaknesses: String(row["Debilidades"] || "").trim(),
      }))
      .filter((row) => row.champion);
  }

  async function loadWorkbook() {
    for (const url of WORKBOOK_URLS) {
      try {
        if (typeof XLSX === "undefined") {
          throw new Error("No se pudo cargar la librería XLSX");
        }

        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const workbook = XLSX.read(await response.arrayBuffer(), { type: "array" });
        const roles = {};
        for (const [roleKey, sheetName] of Object.entries(SHEET_MAP)) {
          roles[roleKey] = readRoleRows(workbook, sheetName);
        }
        return { roles };
      } catch (error) {
        console.warn(`No se pudo cargar el workbook desde ${url}:`, error);
      }
    }
    return null;
  }

  window.LTAWorkbookReader = Object.freeze({ loadWorkbook });
})();
