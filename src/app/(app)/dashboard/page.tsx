/**
 * Dashboard. Na Fase 1 mostra só o resumo de vínculos; na Fase 2 entram
 * "próximas escalas" (voluntário) e "pendências da semana" (líder/ADM).
 */
import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const s = await requireSession();
  const first = s.profile.full_name.split(" ")[0] || "você";

  return (
    <>
      <PageHeader title={`Olá, ${first}`} description="Resumo dos seus ministérios." />

      {s.memberships.length === 0 ? (
        <EmptyState
          title="Você ainda não está em nenhum ministério"
          description={
            s.isAdmin
              ? "Cadastre os ministérios e vincule os voluntários em Administração."
              : "Peça ao líder do seu ministério ou ao administrador para incluir você."
          }
        >
          {s.isAdmin && (
            <Button asChild>
              <Link href="/admin/ministerios">Ir para Ministérios</Link>
            </Button>
          )}
        </EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {s.memberships.map((m) => (
            <Link key={m.id} href={m.is_leader ? `/lider/${m.ministry_id}` : `/ministerios/${m.ministry_id}`}>
              <Card className="h-full hover:bg-accent/40">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {m.ministry.name}
                    {m.is_leader && <Badge>Líder</Badge>}
                  </CardTitle>
                  <CardDescription>{m.role?.name ?? "Sem cargo definido"}</CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {m.is_leader ? "Gerenciar membros e escalas" : "Ver escala do ministério"}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
