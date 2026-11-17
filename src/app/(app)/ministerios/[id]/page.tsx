/** Visão de membro do ministério: equipe e (Fase 2) escala completa. */
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function MinisterioPage({ params }: PageProps<"/ministerios/[id]">) {
  const { id } = await params;
  await requireSession();
  const supabase = await createClient();

  const { data: ministry } = await supabase.from("ministries").select("*").eq("id", id).single();
  if (!ministry) notFound();

  const { data: members } = await supabase
    .from("ministry_members")
    .select("id, is_leader, is_vice_leader, profile:profiles(full_name), role:ministry_roles(name)")
    .eq("ministry_id", id)
    .order("is_leader", { ascending: false });

  return (
    <>
      <PageHeader title={ministry.name} description={ministry.description ?? undefined} />
      <h2 className="mb-2 font-semibold">Equipe</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Cargo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(members ?? []).map((m) => (
            <TableRow key={m.id}>
              <TableCell>
                {m.profile?.full_name} {m.is_leader && <Badge className="ml-2">Líder</Badge>}
                {m.is_vice_leader && <Badge variant="secondary" className="ml-2">Vice-líder</Badge>}
              </TableCell>
              <TableCell>{m.role?.name ?? "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
