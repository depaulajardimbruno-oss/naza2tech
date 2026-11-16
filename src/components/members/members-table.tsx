/**
 * Tabela de membros do ministério: trocar cargo, marcar líder (só ADM), remover.
 * Server Component: os controles interativos são client components pequenos.
 */
import { Trash2Icon } from "lucide-react";
import { setMemberRole, setMemberLeader, removeMember } from "@/lib/actions/members";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ActionSelect } from "@/components/forms/action-select";
import { ActionSwitch } from "@/components/forms/action-switch";
import { ActionButton } from "@/components/forms/action-button";

type Member = {
  id: string;
  is_leader: boolean;
  ministry_role_id: string | null;
  profile: { id: string; full_name: string; email: string | null; phone: string | null } | null;
};

export function MembersTable({
  ministryId,
  members,
  roles,
  canSetLeader,
}: {
  ministryId: string;
  members: Member[];
  roles: { id: string; name: string }[];
  canSetLeader: boolean;
}) {
  if (!members.length) return <p className="text-sm text-muted-foreground">Nenhum membro ainda.</p>;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Cargo</TableHead>
          <TableHead>Líder</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.map((m) => (
          <TableRow key={m.id}>
            <TableCell>
              <p className="font-medium">{m.profile?.full_name}</p>
              <p className="text-xs text-muted-foreground">{m.profile?.phone ?? m.profile?.email}</p>
            </TableCell>
            <TableCell>
              <ActionSelect
                value={m.ministry_role_id}
                options={roles}
                placeholder="Sem cargo"
                action={async (v) => {
                  "use server";
                  return setMemberRole(m.id, ministryId, v);
                }}
              />
            </TableCell>
            <TableCell>
              <ActionSwitch
                checked={m.is_leader}
                disabled={!canSetLeader}
                label="Líder"
                action={async (v) => {
                  "use server";
                  return setMemberLeader(m.id, ministryId, v);
                }}
              />
            </TableCell>
            <TableCell>
              <ActionButton
                variant="ghost"
                size="icon"
                aria-label="Remover do ministério"
                confirm={`Remover ${m.profile?.full_name} do ministério?`}
                action={async () => {
                  "use server";
                  return removeMember(m.id, ministryId);
                }}
              >
                <Trash2Icon className="text-muted-foreground" />
              </ActionButton>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
