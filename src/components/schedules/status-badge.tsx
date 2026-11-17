/**
 * Selo de status da escala (cores do padrão do sistema):
 *   rascunho (cinza) | pendente (amarelo) | confirmado (verde) | recusado (vermelho)
 */
import { Badge } from "@/components/ui/badge";
import type { Enums } from "@/types/database";

export function ScheduleStatusBadge({ status, published }: { status: Enums<"schedule_status">; published: boolean }) {
  if (!published) return <Badge variant="outline">Rascunho</Badge>;
  if (status === "confirmado") return <Badge variant="success">Confirmado</Badge>;
  if (status === "recusado") return <Badge variant="destructive">Não vai</Badge>;
  return <Badge variant="warning">Aguardando</Badge>;
}
