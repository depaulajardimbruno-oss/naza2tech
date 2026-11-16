/** Select nativo que chama uma server action ao mudar. Usado para trocar cargo na tabela. */
"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { NativeSelect } from "@/components/ui/select";
import type { ActionState } from "@/lib/actions/types";

export function ActionSelect({
  value,
  options,
  action,
  placeholder = "—",
}: {
  value: string | null;
  options: { id: string; name: string }[];
  action: (next: string | null) => Promise<ActionState | void>;
  placeholder?: string;
}) {
  const [pending, start] = useTransition();
  return (
    <NativeSelect
      value={value ?? ""}
      disabled={pending}
      className="h-8 w-40 text-xs"
      onChange={(e) => {
        const v = e.target.value || null;
        start(async () => {
          const r = await action(v);
          if (r?.error) toast.error(r.error);
        });
      }}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.name}
        </option>
      ))}
    </NativeSelect>
  );
}
