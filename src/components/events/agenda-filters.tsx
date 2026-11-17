"use client";
/**
 * Filtros da agenda. Cada mudança atualiza a URL na hora (sem botão "Filtrar"),
 * então o filtro vale para o calendário e para a lista e dá para compartilhar o link.
 *   Atalhos: Todos | Igreja (eventos gerais)   +  seletor de ministério  +  busca.
 * `params` vem do servidor com a query string atual (evita useSearchParams/Suspense).
 */
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";

const PERIODS = { proximos: "Próximos", semana: "Próximos 7 dias", mes: "Próximos 30 dias", passados: "Já aconteceram" };

export function AgendaFilters({
  ministries,
  params,
}: {
  ministries: { id: string; name: string }[];
  params: Record<string, string>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const ministerio = params.ministerio ?? "";
  const lista = params.vista === "lista";

  function set(key: string, value: string) {
    const p = new URLSearchParams(params);
    if (value) p.set(key, value);
    else p.delete(key);
    start(() => router.replace(`/agenda?${p.toString()}`, { scroll: false }));
  }

  const pill = (active: boolean) =>
    cn(
      "rounded-full border px-3 py-1.5 text-sm transition-colors",
      active ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
    );

  return (
    <div className={cn("mb-4 flex flex-wrap items-center gap-2", pending && "opacity-70")}>
      <button type="button" className={pill(ministerio === "")} onClick={() => set("ministerio", "")}>
        Todos
      </button>
      <button type="button" className={pill(ministerio === "geral")} onClick={() => set("ministerio", "geral")}>
        Igreja
      </button>
      <NativeSelect
        aria-label="Ministério"
        className="w-auto min-w-44"
        value={ministerio !== "" && ministerio !== "geral" ? ministerio : ""}
        onChange={(e) => set("ministerio", e.target.value)}
      >
        <option value="">Ministério…</option>
        {ministries.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </NativeSelect>
      {lista && (
        <NativeSelect
          aria-label="Período"
          className="w-auto"
          value={params.periodo ?? "proximos"}
          onChange={(e) => set("periodo", e.target.value)}
        >
          {Object.entries(PERIODS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </NativeSelect>
      )}
      <Input
        key={params.q ?? ""}
        aria-label="Buscar evento"
        placeholder="Buscar..."
        className="w-40"
        defaultValue={params.q ?? ""}
        onKeyDown={(e) => e.key === "Enter" && set("q", e.currentTarget.value.trim())}
        onBlur={(e) => e.currentTarget.value.trim() !== (params.q ?? "") && set("q", e.currentTarget.value.trim())}
      />
    </div>
  );
}
