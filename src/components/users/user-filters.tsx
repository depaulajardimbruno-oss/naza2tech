"use client";
/**
 * Filtros da lista de usuários (ADM): busca por nome/telefone/e-mail + ministério + situação.
 * Atualiza a URL na hora (?q=&ministerio=&situacao=); a página filtra no servidor.
 * `params` vem do servidor (evita useSearchParams/Suspense), igual à agenda.
 */
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";

export function UserFilters({
  ministries,
  params,
  total,
  shown,
}: {
  ministries: { id: string; name: string }[];
  params: Record<string, string>;
  total: number;
  shown: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function set(key: string, value: string) {
    const p = new URLSearchParams(params);
    if (value) p.set(key, value);
    else p.delete(key);
    start(() => router.replace(`/admin/usuarios?${p.toString()}`, { scroll: false }));
  }

  return (
    <div className={cn("mb-4 flex flex-wrap items-center gap-2", pending && "opacity-70")}>
      <Input
        key={params.q ?? ""}
        defaultValue={params.q ?? ""}
        placeholder="Buscar por nome, telefone ou e-mail…"
        aria-label="Buscar usuário"
        className="max-w-xs"
        onChange={(e) => set("q", e.target.value)}
      />
      <NativeSelect
        value={params.ministerio ?? ""}
        onChange={(e) => set("ministerio", e.target.value)}
        aria-label="Filtrar por ministério"
        className="max-w-48"
      >
        <option value="">Todos os ministérios</option>
        <option value="sem">Sem ministério</option>
        {ministries.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </NativeSelect>
      <NativeSelect
        value={params.situacao ?? ""}
        onChange={(e) => set("situacao", e.target.value)}
        aria-label="Filtrar por situação"
        className="max-w-40"
      >
        <option value="">Todos</option>
        <option value="ativos">Ativos</option>
        <option value="inativos">Inativos</option>
        <option value="adm">Só ADM</option>
      </NativeSelect>
      <span className="text-xs text-muted-foreground">
        {shown === total ? `${total} usuários` : `${shown} de ${total}`}
      </span>
    </div>
  );
}
