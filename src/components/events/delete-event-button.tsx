"use client";
/**
 * Botão "Remover" de um evento.
 * Precisa ser Client Component porque monta a função da action aqui dentro:
 * um Server Component NÃO pode passar função inline (arrow) para um Client Component.
 * Por isso a lista (server) passa só dados serializáveis: id e título.
 */
import { ActionButton } from "@/components/forms/action-button";
import { deleteEvent } from "@/lib/actions/events";

export function DeleteEventButton({
  id,
  title,
}: {
  id: string;
  title: string;
}) {
  return (
    <ActionButton
      size="sm"
      variant="ghost"
      confirm={`Remover "${title}"?`}
      action={() => deleteEvent(id)}
    >
      Remover
    </ActionButton>
  );
}
