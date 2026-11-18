/**
 * "Zona de risco": card no fim da página com a ação de excluir.
 * O botão pede confirmação; se houver dependências, a action devolve a lista
 * (toast) e NADA é apagado. Server component; o botão é client (ActionButton).
 */
import { Trash2Icon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ActionButton } from "@/components/forms/action-button";
import type { ActionState } from "@/lib/actions/types";

export function DangerZone({
  title,
  description,
  confirm,
  label,
  action,
}: {
  title: string;
  description: string;
  confirm: string;
  label: string;
  action: () => Promise<ActionState | void>;
}) {
  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="text-base text-destructive">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ActionButton variant="destructive" size="sm" confirm={confirm} action={action}>
          <Trash2Icon /> {label}
        </ActionButton>
      </CardContent>
    </Card>
  );
}
