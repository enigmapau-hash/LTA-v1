(() => {
  const DDragonVersionsURL = "https://ddragon.leagueoflegends.com/api/versions.json";
  const DDragonChampionDataURL = (version) =>
    `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`;
  const DDragonIconURL = (version, id) =>
    `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${id}.png`;

  async function loadChampionMeta() {
    try {
      const versionsResponse = await fetch(DDragonVersionsURL);
      const versions = await versionsResponse.json();
      const version = Array.isArray(versions) && versions.length ? versions[0] : null;
      if (!version) throw new Error("No se encontró versión de Data Dragon");

      const response = await fetch(DDragonChampionDataURL(version));
      const payload = await response.json();
      const data = Object.values(payload?.data || {});

      return new Map(
        data.map((champion) => {
          const name = String(champion?.name || "").trim();
          const id = String(champion?.id || "").trim();
          return [
            window.LTAUtils.normalizeText(name),
            { name, id, iconUrl: DDragonIconURL(version, id) },
          ];
        })
      );
    } catch {
      return new Map();
    }
  }

  window.LTAChampionMetadata = Object.freeze({ loadChampionMeta });
})();
