"use client";
/**
 * Campo de telefone com máscara brasileira: (19) 99999-9999 ou (19) 3233-1552.
 * Formata enquanto digita e ao colar. Não controlado: o valor vai no FormData normal.
 */
import { Input } from "@/components/ui/input";
import { formatPhoneBR } from "@/lib/phone";

export function PhoneInput({ defaultValue, ...props }: Omit<React.ComponentProps<typeof Input>, "type" | "onChange">) {
  return (
    <Input
      type="tel"
      inputMode="numeric"
      autoComplete="tel"
      placeholder="(19) 99999-9999"
      maxLength={15}
      {...props}
      defaultValue={defaultValue ? formatPhoneBR(String(defaultValue)) : undefined}
      onChange={(e) => {
        e.currentTarget.value = formatPhoneBR(e.currentTarget.value);
      }}
    />
  );
}
