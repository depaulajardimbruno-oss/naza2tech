"use client";
import { useActionState } from "react";
import { updateMinistry, toggleMinistryActive, toggleMinistryScales } from "@/lib/actions/ministries";
import type { ActionState } from "@/lib/actions/types";
import type { Tables } from "@/types/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormMessage } from "@/components/forms/form-message";
import { ActionSwitch } from "@/components/forms/action-switch";

export function MinistryForm({ ministry }: { ministry: Tables<"ministries"> }) {
  const [state, action] = useActionState<ActionState, FormData>(updateMinistry, {});
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Dados
          <span className="flex items-center gap-2 text-sm font-normal">
            Ativo
            <ActionSwitch checked={ministry.is_active} action={(v) => toggleMinistryActive(ministry.id, v)} />
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <input type="hidden" name="id" value={ministry.id} />
          <div className="flex items-center justify-between rounded-lg border p-3 text-sm">
            <div>
              <p className="font-medium">Usa escala</p>
              <p className="text-muted-foreground">
                Desligado, o ministério só publica eventos na agenda (sem escala de voluntários).
              </p>
            </div>
            <ActionSwitch checked={ministry.scales_enabled} action={(v) => toggleMinistryScales(ministry.id, v)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" name="name" defaultValue={ministry.name} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea id="description" name="description" rows={2} defaultValue={ministry.description ?? ""} />
          </div>
          <FormMessage error={state.error} ok={state.ok} />
          <SubmitButton size="sm">Salvar</SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
