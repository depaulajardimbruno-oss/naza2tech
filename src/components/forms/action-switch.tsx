/**
 * Switch ligado a uma server action. Mostra toast de sucesso/erro.
 * `action` recebe o novo valor e devolve ActionState.
 */
"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import type { ActionState } from "@/lib/actions/types";

export function ActionSwitch({
  checked,
  action,
  disabled,
  label,
}: {
  checked: boolean;
  action: (next: boolean) => Promise<ActionState | void>;
  disabled?: boolean;
  label?: string;
}) {
  const [pending, start] = useTransition();
  return (
    <Switch
      checked={checked}
      disabled={disabled || pending}
      aria-label={label}
      onCheckedChange={(v) =>
        start(async () => {
          const r = await action(v);
          if (r?.error) toast.error(r.error);
          else if (r?.ok) toast.success(r.ok);
        })
      }
    />
  );
}
