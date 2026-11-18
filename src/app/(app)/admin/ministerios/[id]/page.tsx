/**
 * Detalhe do ministério (ADM): dados básicos, cargos e membros/líderes.
 * A lista de "pessoas disponíveis" para adicionar são todos os perfis ativos
 * que ainda não estão neste ministério.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DangerZone } from "@/components/forms/danger-zone";
import { deleteMinistry } from "@/lib/actions/ministries";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { MinistryForm } from "./ministry-form";
import { RolesSection } from "./roles-section";
import { MembersTable } from "@/components/members/members-table";
import { AddMemberForm } from "@/components/members/add-member-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default async function MinistryDetailPage({ params }: PageProps<"/admin/ministerios/[id]">) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: ministry }, { data: roles }, { data: members }, { data: profiles }] = await Promise.all([
    supabase.from("ministries").select("*").eq("id", id).single(),
    supabase.from("ministry_roles").select("id, name").eq("ministry_id", id).order("name"),
    supabase
      .from("ministry_members")
      .select("id, is_leader, is_vice_leader, ministry_role_id, profile:profiles(id, full_name, email, phone), areas:ministry_member_roles(role:ministry_roles(name))")
      .eq("ministry_id", id)
      .order("is_leader", { ascending: false })
      .order("is_vice_leader", { ascending: false }),
    supabase.from("profiles").select("id, full_name, email").eq("active", true).order("full_name"),
  ]);
  if (!ministry) notFound();

  const memberIds = new Set((members ?? []).map((m) => m.profile?.id));
  const available = (profiles ?? []).filter((p) => !memberIds.has(p.id));

  return (
    <>
      <PageHeader title={ministry.name} description="Dados, cargos e equipe do ministério.">
        <div className="flex flex-wrap items-center gap-2">
          {ministry.scales_enabled && (
            <>
              <Button asChild size="sm">
                <Link href={`/lider/${id}/escalas`}>Montar escala</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href={`/lider/${id}/pendencias`}>Pendências</Link>
              </Button>
            </>
          )}
          <Button asChild size="sm" variant="outline">
            <Link href={`/lider/${id}/eventos`}>Eventos</Link>
          </Button>
          {ministry.is_active ? <Badge variant="success">Ativo</Badge> : <Badge variant="secondary">Inativo</Badge>}
        </div>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <MinistryForm ministry={ministry} />
          <RolesSection ministryId={id} roles={roles ?? []} />
        </div>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Equipe</CardTitle>
            <CardDescription>Adicione voluntários, defina o cargo padrão e marque quem é líder.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <AddMemberForm ministryId={id} people={available} roles={roles ?? []} />
            <MembersTable ministryId={id} members={members ?? []} roles={roles ?? []} canSetLeader canSetVice canRemove />
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 max-w-xl">
        <DangerZone
          title="Excluir ministério"
          description="Só é possível se não houver cargos, membros, eventos, cultos fixos nem escalas. Para guardar o histórico, prefira desativar (switch Ativo)."
          confirm={`Excluir o ministério ${ministry.name}? Esta ação não pode ser desfeita.`}
          label="Excluir ministério"
          action={async () => {
            "use server";
            return deleteMinistry(id);
          }}
        />
      </div>
    </>
  );
}
