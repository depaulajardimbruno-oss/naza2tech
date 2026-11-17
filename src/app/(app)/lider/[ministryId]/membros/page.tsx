/**
 * Membros do ministério (visão do líder).
 * Igual à seção de equipe do ADM, mas sem o switch de líder (só ADM define líderes).
 * "Novo voluntário" cria a conta de quem ainda não usa o app (ou vincula quem já tem conta).
 */
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AddMemberForm } from "@/components/members/add-member-form";
import { MembersTable } from "@/components/members/members-table";
import { NewUserDialog } from "@/components/users/new-user-dialog";
import { adminClientConfigured } from "@/lib/supabase/admin";

export default async function LeaderMembersPage({ params }: PageProps<"/lider/[ministryId]/membros">) {
  const { ministryId } = await params;
  const s = await getSession();
  const supabase = await createClient();

  const [{ data: roles }, { data: members }, { data: profiles }, { data: ministry }] = await Promise.all([
    supabase.from("ministry_roles").select("id, name").eq("ministry_id", ministryId).order("name"),
    supabase
      .from("ministry_members")
      .select("id, is_leader, ministry_role_id, profile:profiles(id, full_name, email, phone)")
      .eq("ministry_id", ministryId)
      .order("is_leader", { ascending: false }),
    supabase.from("profiles").select("id, full_name, email").eq("active", true).order("full_name"),
    supabase.from("ministries").select("id, name").eq("id", ministryId).single(),
  ]);

  const memberIds = new Set((members ?? []).map((m) => m.profile?.id));
  const available = (profiles ?? []).filter((p) => !memberIds.has(p.id));

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>Equipe</CardTitle>
          {ministry && (
            <NewUserDialog
              label="Novo voluntário"
              ministries={[ministry]}
              preselected={ministry.id}
              canSetRoles={!!s?.isAdmin}
              enabled={adminClientConfigured()}
            />
          )}
        </div>
        <CardDescription>
          Cadastre quem ainda não usa o app em &quot;Novo voluntário&quot;, ou adicione quem já tem conta abaixo.
          {!roles?.length && " Peça ao administrador para cadastrar os cargos deste ministério."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <AddMemberForm ministryId={ministryId} people={available} roles={roles ?? []} />
        <MembersTable ministryId={ministryId} members={members ?? []} roles={roles ?? []} canSetLeader={!!s?.isAdmin} />
      </CardContent>
    </Card>
  );
}
