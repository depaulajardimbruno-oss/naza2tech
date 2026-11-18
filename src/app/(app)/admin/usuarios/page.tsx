/** Usuários: lista, criar conta (inclusive líder e ADM), promover a ADM, ativar/desativar.
 *  Clicar no nome abre a ficha completa (/admin/usuarios/[id]). */
import { displayEmail } from "@/lib/login-id";
import Link from "next/link";
import { dateTimeBR, lastSeen } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/session";
import { setUserAdmin, setUserActive } from "@/lib/actions/users";
import { PageHeader } from "@/components/layout/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ActionSwitch } from "@/components/forms/action-switch";
import { Badge } from "@/components/ui/badge";
import { adminClientConfigured, adminKeyStatus } from "@/lib/supabase/admin";
import { buttonVariants } from "@/components/ui/button";
import { UserFilters } from "@/components/users/user-filters";
import { NewUserDialog } from "@/components/users/new-user-dialog";

/** minúsculas e sem acento: "José" acha "jose" */
const norm = (v: string) => v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export default async function UsuariosPage({ searchParams }: PageProps<"/admin/usuarios">) {
  const sp = await searchParams;
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k][0] : sp[k]) ?? "";
  const params = { q: one("q"), ministerio: one("ministerio"), situacao: one("situacao") };
  const s = await requireAdmin();
  const supabase = await createClient();
  const { data: users } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, role_global, active, ministry_members(ministry_id, ministry:ministries(name))")
    .order("full_name");
  const { data: ministries } = await supabase.from("ministries").select("id, name").eq("is_active", true).order("name");
  // Filtros (a lista tem poucas dezenas de linhas: filtrar aqui é suficiente)
  const q = norm(params.q.trim());
  const filtered = (users ?? []).filter(
    (u) =>
      (!q || norm(`${u.full_name} ${u.phone ?? ""} ${displayEmail(u.email) ?? ""}`).includes(q)) &&
      (!params.ministerio ||
        (params.ministerio === "sem"
          ? !u.ministry_members?.length
          : u.ministry_members?.some((mm) => mm.ministry_id === params.ministerio))) &&
      (!params.situacao ||
        (params.situacao === "ativos" ? u.active : params.situacao === "inativos" ? !u.active : u.role_global === "admin")),
  );
  const canCreate = adminClientConfigured();
  // Último acesso vem de auth.users via função só-ADM (migration 20261117235534)
  const { data: signIns } = await supabase.rpc("admin_user_sign_ins");
  const lastLogin = new Map((signIns ?? []).map((u) => [u.id, u.last_sign_in_at]));

  return (
    <>
      <PageHeader
        title="Usuários"
        description="Clique no nome para abrir a ficha completa: dados, e-mail, senha e ministérios."
      >
        <Link href="/admin/importar" className={buttonVariants({ variant: "outline" })}>
          Importar planilha
        </Link>
        <NewUserDialog ministries={ministries ?? []} canSetRoles enabled={canCreate} />
      </PageHeader>
      {!canCreate && (
        <p className="mb-4 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
          Para criar usuários pelo painel, falta a variável <code>SUPABASE_SERVICE_ROLE_KEY</code> na Vercel. Situação: {adminKeyStatus()}.
        </p>
      )}
      <UserFilters ministries={ministries ?? []} params={params} total={users?.length ?? 0} shown={filtered.length} />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Contato</TableHead>
            <TableHead>Ministérios</TableHead>
            <TableHead>Último acesso</TableHead>
            <TableHead>ADM</TableHead>
            <TableHead>Ativo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                Nenhum usuário com esses filtros.
              </TableCell>
            </TableRow>
          )}
          {filtered.map((u) => (
            <TableRow key={u.id}>
              <TableCell className="font-medium">
                <Link href={`/admin/usuarios/${u.id}`} className="hover:text-blue2 hover:underline">
                  {u.full_name || "(sem nome)"}
                </Link>{" "}
                {u.id === s.userId && <Badge variant="outline">você</Badge>}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {displayEmail(u.email)}
                {u.phone && <span className="block text-xs">{u.phone}</span>}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {u.ministry_members?.map((mm) => mm.ministry?.name).filter(Boolean).join(", ") || "—"}
              </TableCell>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {(() => {
                  const at = lastLogin.get(u.id) ?? null;
                  return <span title={at ? dateTimeBR(at) : undefined}>{lastSeen(at)}</span>;
                })()}
              </TableCell>
              <TableCell>
                <ActionSwitch
                  checked={u.role_global === "admin"}
                  disabled={u.id === s.userId}
                  action={async (v) => {
                    "use server";
                    return setUserAdmin(u.id, v);
                  }}
                />
              </TableCell>
              <TableCell>
                <ActionSwitch
                  checked={u.active}
                  disabled={u.id === s.userId}
                  action={async (v) => {
                    "use server";
                    return setUserActive(u.id, v);
                  }}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
