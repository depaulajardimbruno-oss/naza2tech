"use client";
/** Diálogo "Novo evento". `ministryId` nulo = evento geral da igreja (só ADM). */
import { useActionState, useState } from "react";
import { PlusIcon } from "lucide-react";
import { createEvent } from "@/lib/actions/events";
import type { ActionState } from "@/lib/actions/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormMessage } from "@/components/forms/form-message";

export function NewEventDialog({ ministryId }: { ministryId: string | null }) {
  const [open, setOpen] = useState(false);
  // Fecha o diálogo quando a action devolve sucesso.
  const [state, action] = useActionState<ActionState, FormData>(async (prev, fd) => {
    const result = await createEvent(prev, fd);
    if (result.ok) setOpen(false);
    return result;
  }, {});

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon /> Novo evento
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo evento</DialogTitle>
        </DialogHeader>
        <form action={action} className="space-y-4">
          <input type="hidden" name="ministry_id" value={ministryId ?? ""} />
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input id="title" name="title" placeholder="Ex.: Culto de domingo" required autoFocus />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="event_date">Data</Label>
              <Input id="event_date" name="event_date" type="date" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="start_time">Início</Label>
              <Input id="start_time" name="start_time" type="time" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_time">Fim</Label>
              <Input id="end_time" name="end_time" type="time" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Textarea id="notes" name="notes" rows={2} />
          </div>
          <FormMessage error={state.error} />
          <DialogFooter>
            <SubmitButton pendingText="Salvando...">Criar evento</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
