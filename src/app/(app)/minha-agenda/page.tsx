/** Placeholder da Fase 2: escalas do voluntário com botões confirmar/recusar. */
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/empty-state";

export default function MinhaAgendaPage() {
  return (
    <>
      <PageHeader title="Minhas escalas" description="Suas próximas escalas (confirmar/recusar entra na Fase 2). A agenda geral está em Agenda." />
      <EmptyState title="Nenhuma escala ainda" description="As escalas aparecem aqui quando o líder publicar." />
    </>
  );
}
