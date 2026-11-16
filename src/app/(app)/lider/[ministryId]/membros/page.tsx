/**
 * Membros do ministério (visão do líder).
 * Igual à seção de equipe do ADM, mas sem o switch de líder (só ADM define líderes).
 */
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AddMemberForm } from "@/components/members/add-member-form";
import { MembersTable } from "@/components/members/members-table";

export default async function LeaderMembersPage({ params }: PageProps<"/lider/[ministryId]/membros">) {
  const { ministryId } = await params;
  const s = await getSession();
  const supabase = await createClient();

  const [{ data: roles }, { data: members }, { data: profiles }] = await Promise.all([
    supabase.from("ministry_roles").select("id, name").eq("ministry_id", ministryId).order("name"),
    supabase
      .from("ministry_members")
      .select("id, is_leader, ministry_role_id, profile:profiles(id, full_name, email, phone)")
      .eq("ministry_id", ministryId)
      .order("is_leader", { ascending: false }),
    supabase.from("profiles").select("id, full_name, email").eq("active", true).order("full_name"),
  ]);

  const memberIds = new Set((members ?? []).map((m) => m.profile?.id));
  const available = (profiles ?? []).filter((p) => !memberIds.has(p.id));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Equipe</CardTitle>
        <CardDescription>
          Adicione voluntários já cadastrados e defina o cargo padrão de cada um.
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
