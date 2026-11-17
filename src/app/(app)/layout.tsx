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
import { requireSession } from "@/lib/auth/session";
import { AppShell, type NavItem } from "@/components/layout/app-shell";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const session = await requireSession();

  const nav: NavItem[] = [
    { href: "/dashboard", label: "Início", icon: "dashboard" },
    { href: "/agenda", label: "Agenda", icon: "calendar" },
    { href: "/minha-agenda", label: "Minhas escalas", icon: "user" },
  ];

  // Ministérios em que participa (visão de membro)
  for (const m of session.memberships) {
    nav.push({ href: `/ministerios/${m.ministry_id}`, label: m.ministry.name, icon: "church", group: "Ministérios" });
  }

  // Ministérios que lidera
  for (const m of session.memberships.filter((x) => x.is_leader)) {
    nav.push({ href: `/lider/${m.ministry_id}`, label: m.ministry.name, icon: "users", group: "Liderança" });
  }

  if (session.isAdmin) {
    nav.push(
      { href: "/admin/ministerios", label: "Ministérios", icon: "church", group: "Administração" },
      { href: "/admin/usuarios", label: "Usuários", icon: "users", group: "Administração" },
      { href: "/admin/eventos", label: "Eventos", icon: "calendar", group: "Administração" }
    );
  }

  nav.push({ href: "/conta", label: "Conta", icon: "user", group: "Você" });

  return (
    <AppShell nav={nav} userName={session.profile.full_name || session.email || "Usuário"}>
      {children}
    </AppShell>
  );
}
