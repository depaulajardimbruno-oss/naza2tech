/**
 * AppShell: estrutura visual da área logada.
 *
 * Desktop: sidebar fixa à esquerda. Mobile: barra inferior com os itens
 * principais + menu "mais". A lista de itens vem pronta do layout (server),
 * já filtrada pelo perfil do usuário; este componente só desenha.
 */
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDaysIcon,
  LayoutDashboardIcon,
  UsersIcon,
  ShieldIcon,
  ChurchIcon,
  LogOutIcon,
  UserIcon,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Brand } from "@/components/layout/brand";
import { signOut } from "@/lib/auth/actions";

export type NavItem = {
  href: string;
  label: string;
  icon: "dashboard" | "calendar" | "users" | "shield" | "church" | "user";
  /** Itens com `group` aparecem em seção separada no desktop. */
  group?: string;
};

const ICONS: Record<NavItem["icon"], LucideIcon> = {
  dashboard: LayoutDashboardIcon,
  calendar: CalendarDaysIcon,
  users: UsersIcon,
  shield: ShieldIcon,
  church: ChurchIcon,
  user: UserIcon,
};

export function AppShell({
  nav,
  userName,
  children,
}: {
  nav: NavItem[];
  userName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const groups = Array.from(new Set(nav.map((n) => n.group ?? "")));
  const mobileItems = nav.filter((n) => !n.group).slice(0, 4);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar desktop */}
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-bg2/60 md:flex">
        <div className="flex h-16 items-center border-b px-4">
          <Brand />
        </div>
        <nav className="flex-1 space-y-4 p-3">
          {groups.map((g) => (
            <div key={g}>
              {g && (
                <p className="mb-1 px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{g}</p>
              )}
              <ul className="space-y-0.5">
                {nav
                  .filter((n) => (n.group ?? "") === g)
                  .map((n) => {
                    const Icon = ICONS[n.icon];
                    return (
                      <li key={n.href}>
                        <Link
                          href={n.href}
                          className={cn(
                            "flex items-center gap-2 rounded-full px-3 py-1.5 text-sm text-muted-foreground hover:bg-white/5 hover:text-foreground",
                            isActive(n.href) && "bg-accent text-blue2 font-medium"
                          )}
                        >
                          <Icon className="size-4" /> {n.label}
                        </Link>
                      </li>
                    );
                  })}
              </ul>
            </div>
          ))}
        </nav>
        <div className="border-t p-3">
          <p className="truncate px-2 text-sm font-medium">{userName}</p>
          <form action={signOut}>
            <button className="mt-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent cursor-pointer">
              <LogOutIcon className="size-4" /> Sair
            </button>
          </form>
        </div>
      </aside>

      {/* Conteúdo */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b bg-bg2/80 px-4 backdrop-blur md:hidden">
          <Brand />
          <Link href="/conta" className="text-sm text-muted-foreground">
            {userName.split(" ")[0]}
          </Link>
        </header>
        <main className="flex-1 p-4 pb-20 md:p-8 md:pb-8">{children}</main>
      </div>

      {/* Barra inferior mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t bg-bg2/90 backdrop-blur md:hidden">
        {mobileItems.map((n) => {
          const Icon = ICONS[n.icon];
          return (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] text-muted-foreground",
                isActive(n.href) && "text-blue2"
              )}
            >
              <Icon className="size-5" /> {n.label}
            </Link>
          );
        })}
        <Link
          href="/conta"
          className={cn(
            "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] text-muted-foreground",
            isActive("/conta") && "text-blue2"
          )}
        >
          <UserIcon className="size-5" /> Conta
        </Link>
      </nav>
    </div>
  );
}
