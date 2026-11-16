/** Retorno padrão de server actions de formulário. */
export type ActionState = { error?: string; ok?: string };

/** Traduz erros comuns do Postgres/RLS para mensagens em português. */
export function friendlyError(message: string): string {
  if (message.includes("row-level security")) return "Você não tem permissão para esta ação.";
  if (message.includes("duplicate key")) return "Já existe um registro com esse nome.";
  if (message.includes("violates foreign key")) return "Este item está em uso e não pode ser removido.";
  return message;
}
