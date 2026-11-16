/** Lista de ministérios com botão de criar. */
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/empty-state";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NewMinistryDialog } from "./new-ministry-dialog";

export default async function MinisteriosPage() {
  const supabase = await createClient();
  const { data: ministries } = await supabase
    .from("ministries")
    .select("id, name, description, is_active, ministry_members(count)")
    .order("name");

  return (
    <>
      <PageHeader title="Ministérios" description="Cadastre os ministérios e gerencie cargos, membros e líderes.">
        <NewMinistryDialog />
      </PageHeader>

      {!ministries?.length ? (
        <EmptyState title="Nenhum ministério cadastrado" description="Comece criando o primeiro, por exemplo: Louvor, Recepção, Mídia.">
          <NewMinistryDialog />
        </EmptyState>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Membros</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ministries.map((m) => (
              <TableRow key={m.id}>
                <TableCell>
                  <Link href={`/admin/ministerios/${m.id}`} className="font-medium hover:underline">
                    {m.name}
                  </Link>
                  {m.description && <p className="text-xs text-muted-foreground">{m.description}</p>}
                </TableCell>
                <TableCell>{m.ministry_members?.[0]?.count ?? 0}</TableCell>
                <TableCell>
                  {m.is_active ? <Badge variant="success">Ativo</Badge> : <Badge variant="secondary">Inativo</Badge>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  );
}
