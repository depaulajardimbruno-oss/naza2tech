"use client";
/** Card "Trocar senha" da página Conta. (Os dados pessoais usam components/people/person-form.) */
import { useActionState } from "react";
import { updatePassword } from "./actions";
import type { AuthState } from "@/lib/auth/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PasswordFields } from "@/components/forms/password-fields";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormMessage } from "@/components/forms/form-message";

export function PasswordCard() {
  const [s, sAction] = useActionState<AuthState, FormData>(updatePassword, {});
  return (
    <Card>
      <CardHeader>
        <CardTitle>Trocar senha</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={sAction} className="space-y-4">
          <PasswordFields label="Nova senha" />
          <FormMessage error={s.error} ok={s.ok} />
          <SubmitButton>Alterar senha</SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
