/** Botão que dispara uma server action sem formulário, com confirmação opcional e toast. */
"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ActionState } from "@/lib/actions/types";

export function ActionButton({
  action,
  confirm,
  children,
  ...props
}: React.ComponentProps<typeof Button> & {
  action: () => Promise<ActionState | void>;
  confirm?: string;
}) {
  const [pending, start] = useTransition();
  return (
    <Button
      {...props}
      disabled={pending || props.disabled}
      onClick={() => {
        if (confirm && !window.confirm(confirm)) return;
        start(async () => {
          const r = await action();
          if (r?.error) toast.error(r.error);
          else if (r?.ok) toast.success(r.ok);
        });
      }}
    >
      {pending ? <Loader2Icon className="animate-spin" /> : children}
    </Button>
  );
}
