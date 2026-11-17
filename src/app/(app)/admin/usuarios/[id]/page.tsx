/**
 * FICHA DO USUÁRIO (ADM): tudo sobre uma pessoa em uma tela.
 *  - Acesso: e-mail de login, redefinir senha, ADM, ativo      (access-card.tsx)
 *  - Ministérios: vínculos, líder/vice, adicionar e remover
 *  - Cadastro completo: dados pessoais, contato, endereço, igreja (components/people/person-form.tsx)
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, Trash2Icon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/session";
import { adminClientConfigured } from "@/lib/supabase/admin";
import { adminSavePerson } from "@/lib/actions/people";
import { setUserAdmin, setUserActive } from "@/lib/actions/users";
import { removeMember } from "@/lib/actions/members";
import { PageHeader } from "@/components/layout/page-header";
import { PersonForm } from "@/components/people/person-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ActionSwitch } from "@/components/forms/action-switch";
import { ActionButton } from "@/components/forms/action-button";
import { AccessCard } from "./access-card";
import { dateTimeBR, lastSeen } from "@/lib/format";
import { AddMinistryForm } from "./add-ministry-form";

export default async function UserDetailPage({ params }: PageProps<"/admin/usuarios/[id]">) {
  const { id } = await params;
  const s = await requireAdmin();
  const supabase = await createClient();

  const [{ data: profile }, { data: details }, { data: memberships }, { data: ministries }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
    supabase.from("profile_details").select("*").eq("profile_id", id).maybeSingle(),
    supabase
      .from("ministry_members")
      .select("id, ministry_id, is_leader, is_vice_leader, ministry:ministries(name), role:ministry_roles(name)")
      .eq("profile_id", id),
    supabase.from("ministries").select("id, name").eq("is_active", true).order("name"),
  ]);
  if (!profile) notFound();
  const { data: signIns } = await supabase.rpc("admin_user_sign_ins");
  const auth = signIns?.find((u) => u.id === id);

  const isSelf = profile.id === s.userId;
  const linked = new Set((memberships ?? []).map((m) => m.ministry_id));
  const available = (ministries ?? []).filter((m) => !linked.has(m.id));

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
        <Link href="/admin/usuarios">
          <ArrowLeftIcon /> Usuários
        </Link>
      </Button>
      <PageHeader title={profile.full_name || "(sem nome)"} description={profile.nickname ? `“${profile.nickname}”` : undefined}>
        <div className="flex gap-2">
          {profile.role_global === "admin" && <Badge>ADM</Badge>}
          {!profile.active && <Badge variant="destructive">Inativo</Badge>}
        </div>
      </PageHeader>

      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="order-2 xl:order-1">
          <PersonForm
            person={{ ...profile, ...(details ?? {}) }}
            action={adminSavePerson}
            hidden={{ profile_id: profile.id }}
          />
        </div>

        <div className="order-1 space-y-6 xl:order-2">
          <AccessCard
            profileId={profile.id}
            email={profile.email ?? ""}
            name={profile.full_name}
            enabled={adminClientConfigured()}
          >
            <div className="space-y-1 border-t pt-4 text-sm">
              <p className="flex justify-between">
                <span className="text-muted-foreground">Último acesso</span>
                <span title={auth?.last_sign_in_at ? dateTimeBR(auth.last_sign_in_at) : undefined}>
                  {lastSeen(auth?.last_sign_in_at ?? null)}
                  {auth?.last_sign_in_at && <span className="text-muted-foreground"> · {dateTimeBR(auth.last_sign_in_at)}</span>}
                </span>
              </p>
              {auth?.created_at && (
                <p className="flex justify-between">
                  <span className="text-muted-foreground">Conta criada</span>
                  <span>{dateTimeBR(auth.created_at)}</span>
                </p>
              )}
            </div>
            <div className="space-y-3 border-t pt-4 text-sm">
              <div className="flex items-center justify-between">
                <span>Administrador geral</span>
                <ActionSwitch
                  checked={profile.role_global === "admin"}
                  disabled={isSelf}
                  action={async (v) => {
                    "use server";
                    return setUserAdmin(id, v);
                  }}
                />
              </div>
              <div className="flex items-center justify-between">
                <span>Ativo (pode entrar no app)</span>
                <ActionSwitch
                  checked={profile.active}
                  disabled={isSelf}
                  action={async (v) => {
                    "use server";
                    return setUserActive(id, v);
                  }}
                />
              </div>
            </div>
          </AccessCard>

          <Card>
            <CardHeader>
              <CardTitle>Ministérios</CardTitle>
              <CardDescription>Líder e vice são definidos na equipe de cada ministério.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {memberships?.length ? (
                <ul className="divide-y rounded-lg border">
                  {memberships.map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                      <div>
                        <Link href={`/admin/ministerios/${m.ministry_id}`} className="font-medium hover:underline">
                          {m.ministry?.name}
                        </Link>
                        <div className="mt-0.5 flex flex-wrap gap-1">
                          {m.is_leader && <Badge>Líder</Badge>}
                          {m.is_vice_leader && <Badge variant="secondary">Vice-líder</Badge>}
                          {m.role && <Badge variant="outline">{m.role.name}</Badge>}
                        </div>
                      </div>
                      <ActionButton
                        variant="ghost"
                        size="icon"
                        aria-label="Remover do ministério"
                        confirm={`Remover ${profile.full_name} de ${m.ministry?.name}?`}
                        action={async () => {
                          "use server";
                          return removeMember(m.id, m.ministry_id);
                        }}
                      >
                        <Trash2Icon className="text-muted-foreground" />
                      </ActionButton>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Ainda não participa de nenhum ministério.</p>
              )}
              {available.length > 0 && <AddMinistryForm profileId={profile.id} ministries={available} />}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
