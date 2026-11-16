"use client";
import { useActionState, useState } from "react";
import { PlusIcon } from "lucide-react";
import { createMinistry } from "@/lib/actions/ministries";
import type { ActionState } from "@/lib/actions/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormMessage } from "@/components/forms/form-message";

export function NewMinistryDialog() {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<ActionState, FormData>(createMinistry, {});

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon /> Novo ministério
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo ministério</DialogTitle>
        </DialogHeader>
        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" name="name" placeholder="Ex.: Louvor" required autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea id="description" name="description" rows={2} />
          </div>
          <FormMessage error={state.error} />
          <DialogFooter>
            <SubmitButton pendingText="Criando...">Criar</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
