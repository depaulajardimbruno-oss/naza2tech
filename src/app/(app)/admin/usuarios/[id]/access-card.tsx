"use client";
/**
 * Card "Acesso" da ficha do usuário (ADM): trocar e-mail de login e redefinir senha.
 * A senha nova aparece uma única vez, com mensagem pronta para WhatsApp.
 */
import { useActionState, useState, useTransition } from "react";
import { CopyIcon, KeyRoundIcon } from "lucide-react";
import { toast } from "sonner";
import { adminChangeEmail, adminResetPassword } from "@/lib/actions/people";
import type { ActionState } from "@/lib/actions/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormMessage } from "@/components/forms/form-message";

const APP_URL = "https://naza2tech.vercel.app";

export function AccessCard({
  profileId,
  email,
  phone,
  name,
  enabled,
  children,
}: {
  profileId: string;
  email: string;
  /** Telefone: é a chave de acesso de quem ainda não tem e-mail. */
  phone: string;
  name: string;
  enabled: boolean;
  children?: React.ReactNode;
}) {
  const [emailState, emailAction] = useActionState<ActionState, FormData>(adminChangeEmail, {});
  const [pending, start] = useTransition();
  const [password, setPassword] = useState<string | null>(null);

  function reset() {
    if (!window.confirm(`Gerar uma nova senha para ${name}? A senha atual deixa de funcionar.`)) return;
    start(async () => {
      const r = await adminResetPassword(profileId);
      if (r.error) toast.error(r.error);
      else setPassword(r.password ?? null);
    });
  }

  const message = password
    ? `Olá! Sua senha do app de escalas da Naza2 foi redefinida.\nAcesse: ${APP_URL}/login\n${email ? `E-mail: ${email}` : `Telefone: ${phone}`}\nSenha provisória: ${password}\nDepois de entrar, troque a senha em Conta.`
    : "";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Acesso</CardTitle>
        <CardDescription>E-mail de login, senha e permissões.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form action={emailAction} className="space-y-2">
          <input type="hidden" name="profile_id" value={profileId} />
          <Label htmlFor="email">E-mail de login (opcional se tiver telefone)</Label>
          <div className="flex gap-2">
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={email}
              placeholder={email ? undefined : "Sem e-mail — entra pelo telefone"}
              required
              disabled={!enabled}
            />
            <SubmitButton variant="outline" disabled={!enabled}>
              Alterar
            </SubmitButton>
          </div>
          <FormMessage error={emailState.error} ok={emailState.ok} />
        </form>

        <div className="space-y-2">
          <Label>Senha</Label>
          {password ? (
            <div className="space-y-2">
              <p className="rounded-lg border bg-white/5 p-3 text-center font-mono text-lg tracking-wider">{password}</p>
              <p className="text-xs text-muted-foreground">Esta senha só aparece agora.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigator.clipboard.writeText(message).then(() => toast.success("Mensagem copiada."))}
              >
                <CopyIcon /> Copiar mensagem para WhatsApp
              </Button>
            </div>
          ) : (
            <Button variant="outline" onClick={reset} disabled={pending || !enabled}>
              <KeyRoundIcon /> {pending ? "Gerando..." : "Redefinir senha"}
            </Button>
          )}
        </div>

        {children}
      </CardContent>
    </Card>
  );
}
