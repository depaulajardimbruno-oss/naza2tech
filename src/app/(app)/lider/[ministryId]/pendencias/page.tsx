/** Placeholder da Fase 2 (motor de escalas). Só abre se o ministério usa escala. */
import { EmptyState } from "@/components/layout/empty-state";
import { requireScalesEnabled } from "@/lib/auth/scales";

export default async function Page({ params }: PageProps<"/lider/[ministryId]/pendencias">) {
  const { ministryId } = await params;
  await requireScalesEnabled(ministryId);
  return <EmptyState title="Em breve" description="Esta área entra na Fase 2 (motor de escalas)." />;
}
