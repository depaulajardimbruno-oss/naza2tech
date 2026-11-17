"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/** `scales: true` = aba só aparece quando o ministério usa escala. */
const TABS = [
  { href: "/membros", label: "Membros", scales: false },
  { href: "/eventos", label: "Eventos", scales: false },
  { href: "/escalas", label: "Escalas", scales: true },
  { href: "/pendencias", label: "Pendências", scales: true },
];

export function LeaderTabs({ base, scalesEnabled }: { base: string; scalesEnabled: boolean }) {
  const pathname = usePathname();
  return (
    <div className="mb-6 flex gap-1 border-b">
      {TABS.filter((t) => scalesEnabled || !t.scales).map((t) => {
        const href = base + t.href;
        const active = pathname.startsWith(href);
        return (
          <Link
            key={t.href}
            href={href}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm",
              active ? "border-primary font-medium" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
