"use client";
/** Adiciona uma pessoa já cadastrada ao ministério, com cargo opcional. Usado por ADM e líder. */
import { displayEmail } from "@/lib/login-id";
import { useActionState, useEffect, useRef } from "react";
import { UserPlusIcon } from "lucide-react";
import { addMember } from "@/lib/actions/members";
import type { ActionState } from "@/lib/actions/types";
import { NativeSelect } from "@/components/ui/select";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormMessage } from "@/components/forms/form-message";

export function AddMemberForm({
  ministryId,
  people,
  roles,
}: {
  ministryId: string;
  people: { id: string; full_name: string; email: string | null }[];
  roles: { id: string; name: string }[];
}) {
  const [state, action] = useActionState<ActionState, FormData>(addMember, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={action} className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input type="hidden" name="ministry_id" value={ministryId} />
        <div className="flex-1">
          <NativeSelect name="profile_id" required defaultValue="">
            <option value="" disabled>
              {people.length ? "Selecione uma pessoa..." : "Todos já estão no ministério"}
            </option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name} {displayEmail(p.email) ? `(${displayEmail(p.email)})` : ""}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="sm:w-44">
          <NativeSelect name="ministry_role_id" defaultValue="">
            <option value="">Sem cargo</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <SubmitButton pendingText="Adicionando..." disabled={!people.length}>
          <UserPlusIcon /> Adicionar
        </SubmitButton>
      </div>
      <FormMessage error={state.error} ok={state.ok} />
    </form>
  );
}
