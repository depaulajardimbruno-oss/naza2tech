/**
 * Guard das telas de ESCALA de um ministério.
 * Ministério com `scales_enabled = false` só usa a agenda; quem tentar abrir
 * /escalas ou /pendencias pela URL volta para a aba de eventos.
 * (O RLS também impede criar escalas nesse caso — ver migration 20261116000200.)
 */
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireScalesEnabled(ministryId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("ministries").select("scales_enabled").eq("id", ministryId).single();
  if (!data?.scales_enabled) redirect(`/lider/${ministryId}/eventos`);
}
