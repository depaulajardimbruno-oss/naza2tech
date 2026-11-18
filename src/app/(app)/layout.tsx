/**
 * Layout da área logada.
 *
 * 1. Exige sessão (redireciona para /login se não houver).
 * 2. Monta o menu conforme o perfil:
 *    - todos:   Início, Agenda (toda a igreja), Minhas escalas, Conta
 *    - líder:   um item por ministério que lidera
 *    - admin:   seção Administração
 * 3. Entrega tudo ao AppShell (client) que só desenha.
 *
 * O menu é UX. A segurança de verdade está no RLS e nos `require*()` de cada página.
 */
import { displayEmail } from "@/lib/login-id";
import { requireSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AppShell, type NavItem } from "@/components/layout/app-shell";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const session = await requireSession();

  const nav: NavItem[] = [
    { href: "/dashboard", label: "Início", icon: "dashboard" },
    { href: "/agenda", label: "Agenda", icon: "calendar" },
    { href: "/minha-agenda", label: "Minhas escalas", icon: "user" },
  ];

  // Ministérios em que participa (visão de membro). Quem é de um ministério com "visão geral"
  // (Pastoral e Secretaria) vê TODOS os ministérios ativos (somente leitura; o RLS garante).
  let visible = session.memberships.map((m) => ({ id: m.ministry_id, name: m.ministry.name }));
  if (session.seesAll) {
    const { data: all } = await (await createClient()).from("ministries").select("id, name").eq("is_active", true).order("name");
    visible = all ?? visible;
  }
  for (const m of visible) {
    nav.push({ href: `/ministerios/${m.id}`, label: m.name, icon: "church", group: "Ministérios" });
  }

  // Ministérios que lidera (líder ou vice)
  for (const m of session.memberships.filter((x) => x.is_leader || x.is_vice_leader)) {
    nav.push({ href: `/lider/${m.ministry_id}`, label: m.ministry.name, icon: "users", group: "Liderança" });
  }

  if (session.isAdmin) {
    nav.push(
      { href: "/admin/ministerios", label: "Ministérios", icon: "church", group: "Administração" },
      { href: "/admin/usuarios", label: "Usuários", icon: "users", group: "Administração" },
      { href: "/admin/escalas", label: "Escalas", icon: "shield", group: "Administração" },
      { href: "/admin/eventos", label: "Eventos", icon: "calendar", group: "Administração" }
    );
  }

  nav.push({ href: "/conta", label: "Conta", icon: "user", group: "Você" });

  return (
    <AppShell nav={nav} userName={session.profile.full_name || displayEmail(session.email) || "Usuário"}>
      {children}
    </AppShell>
  );
}
