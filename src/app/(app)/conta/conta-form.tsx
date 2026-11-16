"use client";
import { useActionState } from "react";
import { updateProfile, updatePassword } from "./actions";
import type { AuthState } from "@/lib/auth/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormMessage } from "@/components/forms/form-message";

export function ContaForm({ profile }: { profile: { full_name: string; phone: string } }) {
  const [p, pAction] = useActionState<AuthState, FormData>(updateProfile, {});
  const [s, sAction] = useActionState<AuthState, FormData>(updatePassword, {});

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Dados pessoais</CardTitle></CardHeader>
        <CardContent>
          <form action={pAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nome completo</Label>
              <Input id="full_name" name="full_name" defaultValue={profile.full_name} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Celular (WhatsApp)</Label>
              <Input id="phone" name="phone" type="tel" defaultValue={profile.phone} placeholder="11 99999-9999" />
            </div>
            <FormMessage error={p.error} ok={p.ok} />
            <SubmitButton>Salvar</SubmitButton>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Trocar senha</CardTitle></CardHeader>
        <CardContent>
          <form action={sAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nova senha</Label>
              <Input id="password" name="password" type="password" minLength={6} autoComplete="new-password" required />
            </div>
            <FormMessage error={s.error} ok={s.ok} />
            <SubmitButton>Alterar senha</SubmitButton>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
