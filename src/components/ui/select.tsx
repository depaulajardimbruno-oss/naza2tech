/**
 * Select nativo estilizado.
 * Escolha deliberada: o <select> do navegador funciona dentro de <form> com
 * server actions sem JS extra e é acessível no celular. Se precisar de busca
 * ou multi-seleção no futuro, troque pelo Select do Radix.
 */
import * as React from "react";
import { ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";

function NativeSelect({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        className={cn(
          "h-9 w-full appearance-none rounded-md border border-input bg-transparent pl-3 pr-8 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 opacity-60" />
    </div>
  );
}

export { NativeSelect };
