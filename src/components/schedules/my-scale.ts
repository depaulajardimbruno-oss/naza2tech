/**
 * "Minha escala" num evento — usado na Agenda para destacar, SÓ para o usuário logado,
 * os eventos em que ele está escalado (escalas publicadas).
 */
import type { Enums } from "@/types/database";

export type MyScale = {
  id: string;
  status: Enums<"schedule_status">;
  ministry: string;
  role: string;
};

/** Prioridade para o destaque no calendário: o que pede ação vem primeiro. */
export function mainStatus(list: MyScale[]): Enums<"schedule_status"> {
  if (list.some((s) => s.status === "pendente")) return "pendente";
  if (list.some((s) => s.status === "recusado")) return "recusado";
  return "confirmado";
}

/** Classe de cor (fundo) por status: amarelo = responder, verde = vai, vermelho = não vai. */
export const STATUS_BG = { pendente: "bg-warning", confirmado: "bg-success", recusado: "bg-destructive" } as const;
export const STATUS_TEXT = { pendente: "Responder", confirmado: "Você vai", recusado: "Você não vai" } as const;
