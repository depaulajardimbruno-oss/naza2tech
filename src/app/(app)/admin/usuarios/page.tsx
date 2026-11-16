/** Usuários cadastrados: promover a ADM, ativar/desativar. */
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/session";
import { setUserAdmin, setUserActive } from "@/lib/actions/users";
import { PageHeader } from "@/components/layout/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ActionSwitch } from "@/components/forms/action-switch";
import { Badge } from "@/components/ui/badge";

export default async function UsuariosPage() {
  const s = await requireAdmin();
  const supabase = await createClient();
  const { data: users } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, role_global, active, ministry_members(ministry:ministries(name))")
    .order("full_name");

  return (
    <>
      <PageHeader
        title="Usuários"
        description="Todos que se cadastraram. Vincule a ministérios na página de cada ministério."
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Contato</TableHead>
            <TableHead>Ministérios</TableHead>
            <TableHead>ADM</TableHead>
            <TableHead>Ativo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(users ?? []).map((u) => (
            <TableRow key={u.id}>
              <TableCell className="font-medium">
                {u.full_name || "(sem nome)"} {u.id === s.userId && <Badge variant="outline">você</Badge>}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {u.email}
                {u.phone && <span className="block text-xs">{u.phone}</span>}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {u.ministry_members?.map((mm) => mm.ministry?.name).filter(Boolean).join(", ") || "—"}
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
