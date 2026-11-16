"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/membros", label: "Membros" },
  { href: "/escalas", label: "Escalas" },
  { href: "/pendencias", label: "Pendências" },
];

export function LeaderTabs({ base }: { base: string }) {
  const pathname = usePathname();
  return (
    <div className="mb-6 flex gap-1 border-b">
      {TABS.map((t) => {
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
