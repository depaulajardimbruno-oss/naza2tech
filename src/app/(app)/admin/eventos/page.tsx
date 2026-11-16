/** Placeholder da Fase 2: cadastro de cultos/eventos. */
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/empty-state";

export default function EventosPage() {
  return (
    <>
      <PageHeader title="Eventos" description="Cultos e compromissos da igreja." />
      <EmptyState title="Em breve" description="O cadastro de eventos entra na Fase 2, junto com as escalas." />
    </>
  );
}
