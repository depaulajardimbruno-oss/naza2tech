/** Placeholder da Fase 2: escalas do voluntário com botões confirmar/recusar. */
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/empty-state";

export default function MinhaAgendaPage() {
  return (
    <>
      <PageHeader title="Minha agenda" description="Suas próximas escalas." />
      <EmptyState title="Nenhuma escala ainda" description="As escalas aparecem aqui quando o líder publicar." />
    </>
  );
}
