"use client";
/** Envia o e-mail de redefinição de senha. */
import Link from "next/link";
import { useActionState } from "react";
import { resetPassword, type AuthState } from "@/lib/auth/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormMessage } from "@/components/forms/form-message";

export default function RecuperarSenhaPage() {
  const [state, action] = useActionState<AuthState, FormData>(resetPassword, {});
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recuperar senha</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <FormMessage error={state.error} ok={state.ok} />
          <SubmitButton className="w-full" pendingText="Enviando...">
            Enviar link
          </SubmitButton>
          <p className="text-center text-sm">
            <Link href="/login" className="text-muted-foreground hover:underline">
              Voltar ao login
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
