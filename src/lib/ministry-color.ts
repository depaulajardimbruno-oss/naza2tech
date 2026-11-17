/**
 * Cor de cada ministério na agenda. Determinística (mesma cor sempre, sem coluna no banco).
 * Evento geral da igreja usa o azul da marca. A cor é só apoio visual:
 * o nome do ministério sempre aparece em texto.
 */
const PALETTE = ["#5fb0ff", "#25d366", "#f5b740", "#ff6b8b", "#a78bfa", "#2dd4bf", "#fb923c", "#e879f9"];
export const CHURCH_COLOR = "#2f7bff";

export function ministryColor(ministryId: string | null) {
  if (!ministryId) return CHURCH_COLOR;
  let h = 0;
  for (const ch of ministryId) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}
