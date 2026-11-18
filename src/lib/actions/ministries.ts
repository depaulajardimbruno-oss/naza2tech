"use server";
/**
 * Actions de MINISTÉRIOS e CARGOS (só ADM).
 * O RLS também bloqueia não-admins; o requireAdmin() aqui é a primeira barreira
 * e evita bater no banco à toa.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/session";
import { friendlyError, type ActionState } from "./types";
import { blockersMessage } from "./blockers";

const ministrySchema = z.object({
  name: z.string().trim().min(2, "Nome muito curto").max(60),
  description: z.string().trim().max(300).optional().or(z.literal("")),
});

export async function createMinistry(_p: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = ministrySchema.safeParse({ name: fd.get("name"), description: fd.get("description") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ministries")
    .insert({ name: parsed.data.name, description: parsed.data.description || null })
    .select("id")
    .single();
  if (error) return { error: friendlyError(error.message) };

  revalidatePath("/admin/ministerios");
  redirect(`/admin/ministerios/${data.id}`);
}

export async function updateMinistry(_p: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = String(fd.get("id"));
  const parsed = ministrySchema.safeParse({ name: fd.get("name"), description: fd.get("description") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase
    .from("ministries")
    .update({ name: parsed.data.name, description: parsed.data.description || null })
    .eq("id", id);
  if (error) return { error: friendlyError(error.message) };

  revalidatePath("/", "layout");
  return { ok: "Ministério atualizado." };
}

/** Ativar/desativar. Desativado some das escalas novas mas mantém histórico. */
export async function toggleMinistryActive(id: string, active: boolean) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("ministries").update({ is_active: active }).eq("id", id);
  revalidatePath("/", "layout");
}

/**
 * Liga/desliga o recurso "escala" do ministério.
 * Desligado: o ministério continua na agenda (eventos), mas some a aba de
 * escalas/pendências do líder e o RLS bloqueia a criação de novas escalas.
 */
export async function toggleMinistryScales(id: string, enabled: boolean) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("ministries").update({ scales_enabled: enabled }).eq("id", id);
  if (error) return { error: friendlyError(error.message) };
  revalidatePath("/", "layout");
  return { ok: enabled ? "Escala ativada." : "Escala desativada." };
}

/**
 * Excluir ministério (só ADM). Bloqueado se tiver cargos, membros, eventos,
 * cultos fixos ou escalas — a mensagem diz o quê. Para manter histórico, desative.
 */
export async function deleteMinistry(id: string): Promise<ActionState> {
  await requireAdmin();
  const supabase = await createClient();
  const blocked = await blockersMessage(supabase, "ministerio", id);
  if (blocked) return { error: blocked };
  const { error } = await supabase.from("ministries").delete().eq("id", id);
  if (error) return { error: friendlyError(error.message) };
  revalidatePath("/", "layout");
  redirect("/admin/ministerios");
}

// ---------- CARGOS ----------

export async function createRole(_p: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const ministry_id = String(fd.get("ministry_id"));
  const name = String(fd.get("name") ?? "").trim();
  if (name.length < 2) return { error: "Nome do cargo muito curto" };

  const supabase = await createClient();
  const { error } = await supabase.from("ministry_roles").insert({ ministry_id, name });
  if (error) return { error: friendlyError(error.message) };

  revalidatePath(`/admin/ministerios/${ministry_id}`);
  return { ok: "Cargo criado." };
}

export async function deleteRole(id: string, ministryId: string): Promise<ActionState> {
  await requireAdmin();
  const supabase = await createClient();
  const blocked = await blockersMessage(supabase, "cargo", id);
  if (blocked) return { error: blocked };
  const { error } = await supabase.from("ministry_roles").delete().eq("id", id);
  if (error) return { error: friendlyError(error.message) };
  revalidatePath(`/admin/ministerios/${ministryId}`);
  return { ok: "Cargo removido." };
}
