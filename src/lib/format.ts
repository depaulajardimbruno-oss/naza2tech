/** Helpers de data/hora em pt-BR. Datas do banco são "YYYY-MM-DD" (sem fuso) e horas "HH:MM:SS". */

/** "20:30:00" -> "20:30" */
export const hhmm = (t: string) => t.slice(0, 5);

/** "2026-11-22" -> "domingo, 22 de novembro" (meio-dia evita virar o dia por fuso) */
export function formatDay(date: string) {
  return new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(
    new Date(`${date}T12:00:00`)
  );
}

/** Data de hoje no fuso de Brasília, "YYYY-MM-DD". */
export function todayBR(offsetDays = 0) {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(d);
}
