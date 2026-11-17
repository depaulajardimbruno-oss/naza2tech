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

// ---------- Calendário em grade ----------
// Tudo em UTC de ponta a ponta para o dia nunca "escorregar" por fuso.
const iso = (d: Date) => d.toISOString().slice(0, 10);

/** "2026-11" + n meses -> "2026-12" */
export function shiftMonth(ym: string, n: number) {
  const [y, m] = ym.split("-").map(Number);
  return iso(new Date(Date.UTC(y, m - 1 + n, 1))).slice(0, 7);
}

/** "2026-11" -> "Novembro de 2026" */
export function monthTitle(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const s = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, 1))
  );
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Semanas (domingo a sábado) que cobrem o mês, incluindo dias dos meses vizinhos. */
export function monthWeeks(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const start = new Date(first.getTime() - first.getUTCDay() * 86_400_000);
  const weeks: { date: string; inMonth: boolean }[][] = [];
  for (let w = 0; w < 6; w++) {
    const week = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start.getTime() + (w * 7 + i) * 86_400_000);
      return { date: iso(d), inMonth: d.getUTCMonth() === m - 1 };
    });
    if (w >= 4 && !week.some((c) => c.inMonth)) break; // não desenha semana 100% fora do mês
    weeks.push(week);
  }
  return weeks;
}
