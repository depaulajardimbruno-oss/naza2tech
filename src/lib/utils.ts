/**
 * Utilitários genéricos de UI.
 *
 * `cn()` junta classes Tailwind sem conflito (ex.: "p-2" + "p-4" vira "p-4").
 * É o mesmo helper usado pelo shadcn/ui, então componentes adicionados depois
 * com `npx shadcn add ...` vão importar daqui sem ajuste.
 */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
