"use server";
/** Actions da página Conta: atualizar perfil e senha do próprio usuário. */
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import type { AuthState } from "@/lib/auth/actions";

export async function updateProfile(_p: AuthState, formData: FormData): Promise<AuthState> {
  const s = await requireSession();
  const parsed = z
    .object({
      full_name: z.string().trim().min(3, "Informe seu nome completo"),
      phone: z.string().trim().max(20).optional().or(z.literal("")),
    })
    .safeParse({ full_name: formData.get("full_name"), phone: formData.get("phone") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.full_name, phone: parsed.data.phone || null })
    .eq("id", s.userId);
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { ok: "Dados atualizados." };
}

export async function updatePassword(_p: AuthState, formData: FormData): Promise<AuthState> {
  const password = String(formData.get("password") ?? "");
  if (password.length < 6) return { error: "Senha deve ter pelo menos 6 caracteres" };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  return { ok: "Senha alterada." };
}
