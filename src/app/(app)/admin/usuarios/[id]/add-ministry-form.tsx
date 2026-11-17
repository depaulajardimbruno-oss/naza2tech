"use client";
/** Vincula o usuário a mais um ministério (reusa a action addMember). */
import { useActionState } from "react";
import { addMember } from "@/lib/actions/members";
import type { ActionState } from "@/lib/actions/types";
import { NativeSelect } from "@/components/ui/select";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormMessage } from "@/components/forms/form-message";

export function AddMinistryForm({ profileId, ministries }: { profileId: string; ministries: { id: string; name: string }[] }) {
  const [state, action] = useActionState<ActionState, FormData>(addMember, {});
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="profile_id" value={profileId} />
      <div className="flex gap-2">
        <NativeSelect name="ministry_id" required defaultValue="" aria-label="Ministério">
          <option value="" disabled>
            Adicionar a um ministério…
          </option>
          {ministries.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </NativeSelect>
        <SubmitButton variant="outline">Adicionar</SubmitButton>
      </div>
      <FormMessage error={state.error} ok={state.ok} />
    </form>
  );
}
