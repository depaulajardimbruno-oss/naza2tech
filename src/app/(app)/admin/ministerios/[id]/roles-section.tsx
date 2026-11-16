"use client";
/** Cargos do ministério (ex.: Vocal, Violão). Criar e remover. */
import { useActionState, useEffect, useRef } from "react";
import { Trash2Icon, PlusIcon } from "lucide-react";
import { createRole, deleteRole } from "@/lib/actions/ministries";
import type { ActionState } from "@/lib/actions/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormMessage } from "@/components/forms/form-message";
import { ActionButton } from "@/components/forms/action-button";

export function RolesSection({ ministryId, roles }: { ministryId: string; roles: { id: string; name: string }[] }) {
  const [state, action] = useActionState<ActionState, FormData>(createRole, {});
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cargos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="divide-y rounded-md border">
          {roles.length === 0 && <li className="p-3 text-sm text-muted-foreground">Nenhum cargo ainda.</li>}
          {roles.map((r) => (
            <li key={r.id} className="flex items-center justify-between p-2 pl-3 text-sm">
              {r.name}
              <ActionButton
                variant="ghost"
                size="icon"
                aria-label="Remover cargo"
                confirm={`Remover o cargo "${r.name}"?`}
                action={() => deleteRole(r.id, ministryId)}
              >
                <Trash2Icon className="text-muted-foreground" />
              </ActionButton>
            </li>
          ))}
        </ul>
        <form ref={formRef} action={action} className="flex gap-2">
          <input type="hidden" name="ministry_id" value={ministryId} />
          <Input name="name" placeholder="Novo cargo" required className="h-8" />
          <SubmitButton size="sm" pendingText="...">
            <PlusIcon />
          </SubmitButton>
        </form>
        <FormMessage error={state.error} />
      </CardContent>
    </Card>
  );
}
