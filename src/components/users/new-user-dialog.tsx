"use client";
/**
 * Diálogo "Novo usuário" — usado pelo ADM (/admin/usuarios) e pelo líder (/lider/[id]/membros).
 *
 * `canSetRoles` (só ADM): mostra "Administrador geral" e a coluna "Líder" por ministério.
 * `canSetVice` (ADM ou líder titular): mostra a coluna "Vice" por ministério.
 * `ministries`: ministérios que quem está cadastrando pode usar (ADM: todos; líder: os dele).
 * `preselected`: ministério já marcado (ex.: a página do ministério do líder).
 *
 * Conta nova: mostra a SENHA PROVISÓRIA uma única vez, com mensagem pronta para WhatsApp.
 * E-mail que já tem conta: só vincula (a action avisa).
 */
import { useActionState, useState } from "react";
import { CopyIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { createUser, type CreateUserState } from "@/lib/actions/users";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormMessage } from "@/components/forms/form-message";
import { cn } from "@/lib/utils";

const APP_URL = "https://naza2tech.vercel.app";

type Props = {
  ministries: { id: string; name: string }[];
  canSetRoles: boolean;
  canSetVice?: boolean;
  enabled: boolean;
  preselected?: string;
  label?: string;
};

export function NewUserDialog({
  label = "Novo usuário",
  enabled,
  ...rest
}: Props) {
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setFormKey((k) => k + 1); // nova chave = formulário e senha zerados na próxima abertura
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          disabled={!enabled}
          title={enabled ? undefined : "Configuração pendente no servidor"}
        >
          <PlusIcon /> {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
        </DialogHeader>
        <NewUserForm
          key={formKey}
          {...rest}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

/** Formulário + tela de resultado. Fica num componente próprio para o estado reiniciar a cada abertura. */
function NewUserForm({
  ministries,
  canSetRoles,
  canSetVice = canSetRoles,
  preselected,
  onDone,
}: Omit<Props, "enabled" | "label"> & { onDone: () => void }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [state, action] = useActionState<CreateUserState, FormData>(
    createUser,
    {},
  );
  const done = !!state.ok || !!state.password;
  // Colunas: Membro | Vice? | Líder?  (classes fixas: o Tailwind não enxerga classe montada em runtime)
  const extraCols = (canSetVice ? 1 : 0) + (canSetRoles ? 1 : 0);
  const grid = cn(
    "grid items-center gap-4",
    extraCols === 2
      ? "grid-cols-[1fr_2.5rem_2.5rem]"
      : extraCols === 1
        ? "grid-cols-[1fr_2.5rem]"
        : "grid-cols-1",
  );

  const message = state.password
    ? `Olá! Sua conta no app de escalas da Naza2 foi criada.\nAcesse: ${APP_URL}/login\nE-mail: ${state.email}\nSenha provisória: ${state.password}\nDepois de entrar, troque a senha em Conta.`
    : "";

  return done ? (
    <div className="space-y-4">
      {state.password ? (
        <>
          <p className="text-sm">
            Conta de <strong>{state.email}</strong> criada. Esta senha só
            aparece agora:
          </p>
          <p className="rounded-lg border bg-white/5 p-3 text-center font-mono text-lg tracking-wider">
            {state.password}
          </p>
        </>
      ) : (
        <p className="text-sm">{state.ok}</p>
      )}
      {state.error && <FormMessage error={state.error} />}
      <DialogFooter>
        {state.password && (
          <Button
            variant="outline"
            onClick={() =>
              navigator.clipboard
                .writeText(message)
                .then(() => toast.success("Mensagem copiada."))
            }
          >
            <CopyIcon /> Copiar mensagem para WhatsApp
          </Button>
        )}
        <Button onClick={onDone}>Concluir</Button>
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
          <Input
            id="phone"
            name="phone"
            type="tel"
            placeholder="(19) 99999-9999"
          />
        </div>
      </div>

      {canSetRoles && (
        <label className="flex items-start gap-3 rounded-lg border p-3 text-sm">
          <input
            type="checkbox"
            name="is_admin"
            className="mt-0.5 accent-primary"
            checked={isAdmin}
            onChange={(e) => setIsAdmin(e.target.checked)}
          />
          <span>
            <span className="font-medium">Administrador geral</span>
            <span className="block text-muted-foreground">
              Acesso total: ministérios, usuários, eventos e escalas.
            </span>
          </span>
        </label>
      )}

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">
          Ministérios{canSetRoles ? " (opcional)" : ""}
        </legend>
        <div className="max-h-56 overflow-y-auto rounded-lg border">
          {extraCols > 0 && (
            <div
              className={cn(
                grid,
                "sticky top-0 border-b bg-card px-3 py-1.5 text-xs text-muted-foreground",
              )}
            >
              <span>Membro</span>
              {canSetVice && <span className="text-center">Vice</span>}
              {canSetRoles && <span className="text-center">Líder</span>}
            </div>
          )}
          {ministries.map((m) => (
            <div
              key={m.id}
              className={cn(grid, "px-3 py-1.5 text-sm hover:bg-white/5")}
            >
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="ministries"
                  value={m.id}
                  defaultChecked={m.id === preselected}
                  className="accent-primary"
                />
                {m.name}
              </label>
              {canSetVice && (
                <input
                  type="checkbox"
                  name="vice_of"
                  value={m.id}
                  aria-label={`Vice-líder de ${m.name}`}
                  className="mx-auto accent-primary"
                />
              )}
              {canSetRoles && (
                <input
                  type="checkbox"
                  name="leader_of"
                  value={m.id}
                  aria-label={`Líder de ${m.name}`}
                  className="mx-auto accent-primary"
                />
              )}
            </div>
          ))}
        </div>
        {extraCols > 0 && (
          <p className="text-xs text-muted-foreground">
            Marcar {canSetRoles ? "Vice ou Líder" : "Vice"} já inclui a pessoa
            como membro.
          </p>
        )}
      </fieldset>

      <FormMessage error={state.error} />
      <DialogFooter>
        <SubmitButton pendingText="Salvando...">Cadastrar</SubmitButton>
      </DialogFooter>
    </form>
  );
}
