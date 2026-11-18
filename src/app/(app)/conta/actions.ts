"use server";
/** Actions da página Conta: trocar a própria senha. (Dados pessoais: lib/actions/people.ts → saveMyPerson.) */
import { createClient } from "@/lib/supabase/server";
import type { AuthState } from "@/lib/auth/actions";
import { passwordWithConfirm } from "@/lib/password";

/** Troca de senha (também é o destino do link "esqueci a senha"). Política em lib/password.ts. */
export async function updatePassword(_p: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = passwordWithConfirm.safeParse({
    password: String(formData.get("password") ?? ""),
    password_confirm: String(formData.get("password_confirm") ?? ""),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error?.message.includes("different from the old")) return { error: "A nova senha precisa ser diferente da atual." };
  if (error) return { error: error.message };
  return { ok: "Senha alterada." };
}
