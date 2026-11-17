/**
 * Guard + sub-navegação da área do líder.
 * Só líder do ministério (ou ADM) passa. Abas: Membros, Eventos e — só se o ministério usa escala — Escalas e Pendências.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireLeaderOf } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { LeaderTabs } from "./leader-tabs";

export default async function LeaderLayout({ children, params }: LayoutProps<"/lider/[ministryId]">) {
  const { ministryId } = await params;
  await requireLeaderOf(ministryId);

  const supabase = await createClient();
  const { data: ministry } = await supabase.from("ministries").select("id, name, scales_enabled").eq("id", ministryId).single();
  if (!ministry) notFound();

  return (
    <>
      <div className="mb-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Liderança</p>
        <h1 className="text-2xl font-bold tracking-tight">
          <Link href={`/lider/${ministryId}`}>{ministry.name}</Link>
        </h1>
      </div>
      <LeaderTabs base={`/lider/${ministryId}`} scalesEnabled={ministry.scales_enabled} />
      {children}
    </>
  );
}
