(() => {
  const normalizeText = (value) =>
    String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[\"'`´’]/g, "")
      .trim()
      .toLowerCase();

  const escapeHtml = (value) =>
    String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  const splitList = (value) =>
    String(value || "")
      .split(/[;,·\n]/)
      .map((part) => part.trim())
      .filter(Boolean);

  window.LTAUtils = Object.freeze({
    normalizeText,
    escapeHtml,
    splitList,
  });

  window.normalizeText = normalizeText;
  window.escapeHtml = escapeHtml;
  window.splitList = splitList;
})();
