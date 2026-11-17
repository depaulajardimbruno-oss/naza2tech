"use client";
/**
 * "+ Escalar" de um evento (líder/vice). Abre um mini-formulário inline:
 * pessoa + função (já sugere o cargo padrão da pessoa). Conflito com outro
 * ministério chega como aviso (toast amarelo) — a escala é criada mesmo assim.
 */
import { useActionState, useEffect, useState } from "react";
import { PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { assignSchedule, type ScheduleState } from "@/lib/actions/schedules";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/select";
import { SubmitButton } from "@/components/forms/submit-button";

export type MemberOption = { id: string; name: string; defaultRoleId: string | null };

export function AssignForm({
  ministryId,
  eventId,
  members,
  roles,
}: {
  ministryId: string;
  eventId: string;
  members: MemberOption[];
  roles: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [roleId, setRoleId] = useState("");
  const [formKey, setFormKey] = useState(0);
  const [state, action] = useActionState<ScheduleState, FormData>(async (prev, fd) => {
    const r = await assignSchedule(prev, fd);
    if (r.ok) setFormKey((k) => k + 1); // limpa para escalar o próximo
    return r;
  }, {});

  // feedback: sucesso, aviso de conflito ou erro
  useEffect(() => {
    if (state.warning) toast.warning(state.warning, { duration: 10_000 });
    else if (state.ok) toast.success(state.ok);
    if (state.error) toast.error(state.error);
  }, [state]);

  if (!members.length)
    return <p className="text-xs text-muted-foreground">Ninguém disponível: adicione pessoas na aba Membros.</p>;
  if (!roles.length) return <p className="text-xs text-muted-foreground">Cadastre funções (cargos) para este ministério.</p>;

  if (!open)
    return (
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <PlusIcon /> Escalar
      </Button>
    );

  return (
    <form key={formKey} action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="ministry_id" value={ministryId} />
      <input type="hidden" name="event_id" value={eventId} />
      <NativeSelect
        name="member_id"
        required
        defaultValue=""
        aria-label="Pessoa"
        className="min-w-44"
        onChange={(e) => setRoleId(members.find((m) => m.id === e.target.value)?.defaultRoleId ?? "")}
      >
        <option value="" disabled>
          Pessoa…
        </option>
        {members.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </NativeSelect>
      <NativeSelect
        name="role_id"
        required
        value={roleId}
        onChange={(e) => setRoleId(e.target.value)}
        aria-label="Função"
        className="min-w-36"
      >
        <option value="" disabled>
          Função…
        </option>
        {roles.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
      </NativeSelect>
      <SubmitButton size="sm" pendingText="...">
        Adicionar
      </SubmitButton>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
        Fechar
      </Button>
    </form>
  );
}
