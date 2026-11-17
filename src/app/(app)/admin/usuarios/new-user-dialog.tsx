"use client";
/**
 * Diálogo "Novo usuário" (ADM).
 * Depois de criar, mostra a SENHA PROVISÓRIA uma única vez, com botão de copiar
 * a mensagem pronta para mandar no WhatsApp. A senha não fica salva em lugar nenhum.
 */
import { useActionState, useState } from "react";
import { CopyIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { createUser, type CreateUserState } from "@/lib/actions/users";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormMessage } from "@/components/forms/form-message";

const APP_URL = "https://naza2tech.vercel.app";

export function NewUserDialog({ ministries, enabled }: { ministries: { id: string; name: string }[]; enabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [state, action] = useActionState<CreateUserState, FormData>(createUser, {});

  const message = state.password
    ? `Olá! Sua conta no app de escalas da Naza2 foi criada.\nAcesse: ${APP_URL}/login\nE-mail: ${state.email}\nSenha provisória: ${state.password}\nDepois de entrar, troque a senha em Conta.`
    : "";

  function reset(next: boolean) {
    setOpen(next);
    if (!next) setFormKey((k) => k + 1); // ao fechar, limpa o formulário e a senha exibida
  }

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogTrigger asChild>
        <Button disabled={!enabled} title={enabled ? undefined : "Configure SUPABASE_SERVICE_ROLE_KEY na Vercel"}>
          <PlusIcon /> Novo usuário
        </Button>
      </DialogTrigger>
      <DialogContent key={formKey}>
        <DialogHeader>
          <DialogTitle>Novo usuário</DialogTitle>
        </DialogHeader>

        {state.password ? (
          <div className="space-y-4">
            <p className="text-sm">
              Conta de <strong>{state.email}</strong> criada. Esta senha só aparece agora:
            </p>
            <p className="rounded-lg border bg-white/5 p-3 text-center font-mono text-lg tracking-wider">{state.password}</p>
            {state.error && <FormMessage error={state.error} />}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => navigator.clipboard.writeText(message).then(() => toast.success("Mensagem copiada."))}
              >
                <CopyIcon /> Copiar mensagem para WhatsApp
              </Button>
              <Button onClick={() => reset(false)}>Concluir</Button>
            </DialogFooter>
          </div>
        ) : (
          <form action={action} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nome completo</Label>
              <Input id="full_name" name="full_name" required autoFocus />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" name="email" type="email" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">WhatsApp (opcional)</Label>
                <Input id="phone" name="phone" type="tel" placeholder="(19) 99999-9999" />
              </div>
            </div>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Ministérios (opcional)</legend>
              <div className="grid max-h-48 grid-cols-2 gap-1 overflow-y-auto rounded-lg border p-2">
                {ministries.map((m) => (
                  <label key={m.id} className="flex items-center gap-2 rounded px-1 py-1 text-sm hover:bg-white/5">
                    <input type="checkbox" name="ministries" value={m.id} className="accent-primary" />
                    {m.name}
                  </label>
                ))}
              </div>
            </fieldset>
            <FormMessage error={state.error} />
            <DialogFooter>
              <SubmitButton pendingText="Criando...">Criar usuário</SubmitButton>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
