/**
 * Mensagem de "não dá para excluir" a partir da função do banco delete_blockers().
 * Toda exclusão chama isto ANTES de apagar. Se voltar texto, a exclusão é abortada
 * e a tela mostra o que está ligado (ex.: "Escalas (1): 22/11 Culto Devocional").
 * O banco também recusa sozinho (FKs RESTRICT, migration 20261118001636) — isto aqui
 * só deixa o aviso legível.
 */
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;
export type BlockEntity = "usuario" | "ministerio" | "cargo" | "evento" | "membro";

const HINT: Record<BlockEntity, string> = {
  usuario: "Tire a pessoa das escalas e dos ministérios. Para guardar o histórico, prefira DESATIVAR o usuário.",
  ministerio: "Remova escalas, eventos, membros e cargos antes. Para guardar o histórico, prefira DESATIVAR o ministério.",
  cargo: "Troque o cargo dessas pessoas e tire essa função das escalas antes.",
  evento: "Tire as pessoas da escala deste evento antes.",
  membro: "Tire a pessoa das escalas deste ministério antes.",
};

export async function blockersMessage(supabase: Client, entity: BlockEntity, id: string): Promise<string | null> {
  const { data, error } = await supabase.rpc("delete_blockers", { p_entity: entity, p_id: id });
  if (error) return `Não foi possível verificar dependências: ${error.message}`;
  if (!data?.length) return null;
  const lines = data.map((b) => `• ${b.item} (${b.total})${b.exemplos ? `: ${b.exemplos}` : ""}`);
  return `Não dá para excluir: ainda há itens ligados.\n${lines.join("\n")}\n${HINT[entity]}`;
}
