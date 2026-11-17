"use server";
/** Actions da página Conta: trocar a própria senha. (Dados pessoais: lib/actions/people.ts → saveMyPerson.) */
import { createClient } from "@/lib/supabase/server";
import type { AuthState } from "@/lib/auth/actions";

export async function updatePassword(_p: AuthState, formData: FormData): Promise<AuthState> {
  const password = String(formData.get("password") ?? "");
  if (password.length < 6) return { error: "Senha deve ter pelo menos 6 caracteres" };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  return { ok: "Senha alterada." };
}
