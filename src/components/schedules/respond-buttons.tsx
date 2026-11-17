"use client";
/**
 * Botões do voluntário numa escala: "Confirmar" e "Não posso".
 * "Não posso" abre um campo de MOTIVO (obrigatório) e a opção "pedir troca".
 * A pessoa pode mudar de ideia depois (confirmar após recusar e vice-versa).
 */
import { useActionState, useEffect, useState } from "react";
import { CheckIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { respondSchedule } from "@/lib/actions/schedules";
import type { ActionState } from "@/lib/actions/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/forms/submit-button";

export function RespondButtons({ scheduleId, status }: { scheduleId: string; status: "pendente" | "confirmado" | "recusado" }) {
  const [declining, setDeclining] = useState(false);
  const [state, action] = useActionState<ActionState, FormData>(async (prev, fd) => {
    const r = await respondSchedule(prev, fd);
    if (r.ok) setDeclining(false);
    return r;
  }, {});

  useEffect(() => {
    if (state.ok) toast.success(state.ok);
    if (state.error) toast.error(state.error);
  }, [state]);

  if (declining)
    return (
      <form action={action} className="w-full space-y-2">
        <input type="hidden" name="schedule_id" value={scheduleId} />
        <input type="hidden" name="status" value="recusado" />
        <Textarea name="reason" rows={2} required placeholder="Motivo (o líder vai ver)" autoFocus />
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" name="swap" className="accent-primary" /> Quero pedir troca com alguém
        </label>
        <div className="flex gap-2">
          <SubmitButton size="sm" variant="destructive">
            Informar ausência
          </SubmitButton>
          <Button type="button" size="sm" variant="ghost" onClick={() => setDeclining(false)}>
            Voltar
          </Button>
        </div>
      </form>
    );

  return (
    <div className="flex gap-2">
      {status !== "confirmado" && (
        <form action={action}>
          <input type="hidden" name="schedule_id" value={scheduleId} />
          <input type="hidden" name="status" value="confirmado" />
          <SubmitButton size="sm" className="bg-success text-white hover:bg-success/90">
            <CheckIcon /> Confirmar
          </SubmitButton>
        </form>
      )}
      {status !== "recusado" && (
        <Button size="sm" variant="outline" onClick={() => setDeclining(true)}>
          <XIcon /> Não posso
        </Button>
      )}
    </div>
  );
}
