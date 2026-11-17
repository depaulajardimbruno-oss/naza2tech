/**
 * Marca do app: "NAZA2 / CAMPINAS" no estilo do cabeçalho do site institucional.
 * Quando o arquivo public/logo.jpg existir (logo oficial da igreja), ele é
 * mostrado ao lado; até lá, o ícone de chama do Nazareno é representado por
 * um círculo com a inicial.
 */
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Brand({ href = "/dashboard", className, size = "md" }: { href?: string; className?: string; size?: "md" | "lg" }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "grid place-items-center rounded-full border border-white/15 bg-white/5 font-display font-bold text-blue2",
          size === "lg" ? "size-12 text-lg" : "size-9 text-sm"
        )}
      >
        N
      </span>
      <span className="leading-none">
        <span className={cn("block font-display font-bold tracking-wide", size === "lg" ? "text-xl" : "text-sm")}>NAZA2</span>
        <span className={cn("block tracking-[0.25em] text-muted-foreground", size === "lg" ? "text-[11px]" : "text-[9px]")}>
          CAMPINAS
        </span>
      </span>
    </Link>
  );
}
