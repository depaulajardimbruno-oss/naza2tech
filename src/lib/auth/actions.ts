"use server";
/**
 * Server actions de autenticação.
 *
 * Todas retornam `{ error?: string }` para o formulário mostrar a mensagem,
 * e redirecionam em caso de sucesso. Usadas com `useActionState` nos forms.
 *
 * Fluxo de cadastro: o usuário se cadastra sozinho; o trigger
 * `handle_new_user` no banco cria a linha em `profiles` automaticamente
 * com role_global = 'user'. Promover a admin e vincular a ministérios é
 * tarefa do ADM nas telas /admin.
 */
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { phoneBR } from "@/lib/phone";
import { passwordSchema } from "@/lib/password";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; ok?: string };

// Login não aplica a política nova (contas antigas continuam entrando).
const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Informe a senha"),
});

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data: auth, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (!error && auth.user) {
    // Usuário INATIVO: senha certa, mas o acesso foi desativado pelo ADM.
    const { data: profile } = await supabase.from("profiles").select("active").eq("id", auth.user.id).single();
    if (profile && !profile.active) {
      await supabase.auth.signOut();
      return { error: "Seu acesso está desativado. Fale com o administrador ou com o líder do seu ministério." };
    }
  }
  if (error) {
    return {
      error:
        error.message === "Invalid login credentials"
          ? "E-mail ou senha incorretos"
          : error.message === "Email not confirmed"
            ? "Confirme seu e-mail antes de entrar"
            : error.message,
    };
  }

  const next = String(formData.get("next") ?? "") || "/dashboard";
  redirect(next.startsWith("/") ? next : "/dashboard");
}

// Cadastro: senha forte + confirmação (política em lib/password.ts)
const signUpSchema = z
  .object({
    email: z.string().email("E-mail inválido"),
    password: passwordSchema,
    password_confirm: z.string(),
    full_name: z.string().trim().min(3, "Informe seu nome completo"),
    phone: phoneBR,
  })
  .refine((v) => v.password === v.password_confirm, { message: "As senhas não conferem." });

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    password_confirm: formData.get("password_confirm"),
    full_name: formData.get("full_name"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const origin = (await headers()).get("origin") ?? "";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      // Esses metadados são lidos pelo trigger handle_new_user
      data: { full_name: parsed.data.full_name, phone: parsed.data.phone },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });
  if (error) return { error: error.message };

  // Se a confirmação de e-mail estiver desligada no Supabase, já há sessão.
  if (data.session) redirect("/dashboard");
  return { ok: "Cadastro feito. Verifique seu e-mail para confirmar a conta." };
}

export async function resetPassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "");
  if (!z.string().email().safeParse(email).success) return { error: "E-mail inválido" };

  const origin = (await headers()).get("origin") ?? "";
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/conta`,
  });
  if (error) return { error: error.message };
  return { ok: "Se o e-mail existir, enviamos um link para redefinir a senha." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
