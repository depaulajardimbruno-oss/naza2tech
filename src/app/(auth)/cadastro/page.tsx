"use client";
/** Cadastro de voluntário. Depois do cadastro o ADM vincula a pessoa a um ministério. */
import Link from "next/link";
import { PhoneInput } from "@/components/forms/phone-input";
import { PasswordFields } from "@/components/forms/password-fields";
import { useActionState } from "react";
import { signUp, type AuthState } from "@/lib/auth/actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormMessage } from "@/components/forms/form-message";

export default function CadastroPage() {
  const [state, action] = useActionState<AuthState, FormData>(signUp, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle>Criar conta</CardTitle>
        <CardDescription>Use o mesmo celular do WhatsApp para receber lembretes.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Nome completo</Label>
            <Input id="full_name" name="full_name" autoComplete="name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Celular (WhatsApp)</Label>
            <PhoneInput id="phone" name="phone" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <PasswordFields />
          <FormMessage error={state.error} ok={state.ok} />
          <SubmitButton className="w-full" pendingText="Criando...">
            Criar conta
          </SubmitButton>
          <p className="text-center text-sm text-muted-foreground">
            Já tem conta?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Entrar
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
