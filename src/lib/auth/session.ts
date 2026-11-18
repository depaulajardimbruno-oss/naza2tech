/**
 * Sessão enriquecida: usuário + perfil + ministérios em que participa.
 *
 * É o ponto único que os layouts e páginas usam para saber "quem é" o usuário
 * logado e o que ele pode ver. Tudo aqui respeita o RLS, então um voluntário
 * só recebe seus próprios vínculos.
 *
 *   const s = await getSession();      // null se deslogado
 *   s.isAdmin                          // role_global === 'admin'
 *   s.leaderOf                         // ids dos ministérios que lidera
 *   s.memberships                      // vínculos com nome do ministério e cargo
 *
 * `requireSession()` / `requireAdmin()` / `requireLeaderOf(id)` redirecionam
 * quando a condição falha, para usar direto no topo de layouts e actions.
 */
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type Membership = {
  id: string;
  ministry_id: string;
  is_leader: boolean;
  /** Vice-líder: mesmas permissões do líder no ministério, exceto nomear vice. */
  is_vice_leader: boolean;
  ministry: Pick<Tables<"ministries">, "id" | "name" | "is_active">;
  role: Pick<Tables<"ministry_roles">, "id" | "name"> | null;
};

export type Session = {
  userId: string;
  email: string | null;
  profile: Tables<"profiles">;
  isAdmin: boolean;
  isLeader: boolean;
  /** Ministérios que lidera como LÍDER ou VICE (acesso à área de liderança). */
  leaderOf: string[];
  /** Só onde é líder TITULAR (pode nomear vice). */
  mainLeaderOf: string[];
  memberships: Membership[];
};

/** `cache()` evita repetir as queries quando layout e page chamam na mesma requisição. */
export const getSession = cache(async (): Promise<Session | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: memberships }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("ministry_members")
      .select(
        "id, ministry_id, is_leader, is_vice_leader, ministry:ministries(id, name, is_active), role:ministry_roles(id, name)"
      )
      .eq("profile_id", user.id),
  ]);

  if (!profile) return null;

  // Ministério INATIVO some do uso (menu, início, liderança, minhas escalas).
  // O ADM continua vendo tudo pelas telas de Administração.
  const list = ((memberships ?? []) as unknown as Membership[]).filter((m) => m.ministry?.is_active);
  const leaderOf = list.filter((m) => m.is_leader || m.is_vice_leader).map((m) => m.ministry_id);
  const mainLeaderOf = list.filter((m) => m.is_leader).map((m) => m.ministry_id);

  return {
    userId: user.id,
    email: user.email ?? null,
    profile,
    isAdmin: profile.role_global === "admin" && profile.active,
    isLeader: leaderOf.length > 0,
    leaderOf,
    mainLeaderOf,
    memberships: list,
  };
});

export async function requireSession(): Promise<Session> {
  const s = await getSession();
  if (!s) redirect("/login");
  // Usuário inativo: encerra a sessão (route handler apaga o cookie) e avisa no login.
  if (!s.profile.active) redirect("/auth/inativo");
  return s;
}

export async function requireAdmin(): Promise<Session> {
  const s = await requireSession();
  if (!s.isAdmin) redirect("/dashboard");
  return s;
}

/** ADM também passa: ele pode tudo que um líder pode. */
export async function requireLeaderOf(ministryId: string): Promise<Session> {
  const s = await requireSession();
  if (!s.isAdmin && !s.leaderOf.includes(ministryId)) redirect("/dashboard");
  return s;
}
