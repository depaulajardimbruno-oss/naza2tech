/**
 * Telefone no padrão brasileiro. Gravamos SEMPRE formatado:
 *   celular (11 dígitos): (19) 99999-9999
 *   fixo    (10 dígitos): (19) 3233-1552
 * Usado pela máscara do campo (components/forms/phone-input.tsx) e pela validação
 * no servidor (zod `phoneBR`), para o banco nunca ter formatos misturados.
 * Obs.: a Fase 3 (WhatsApp) converte para +55DDDNÚMERO na hora do envio.
 */
import { z } from "zod";

/** Só os dígitos, sem o +55 se a pessoa colar com DDI. Máximo 11. */
export function phoneDigits(v: string) {
  let d = v.replace(/\D/g, "");
  if (d.length > 11 && d.startsWith("55")) d = d.slice(2);
  return d.slice(0, 11);
}

/** Formata progressivamente (serve para a máscara enquanto digita). */
export function formatPhoneBR(v: string) {
  const d = phoneDigits(v);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  const ddd = d.slice(0, 2);
  const rest = d.slice(2);
  if (d.length <= 6) return `(${ddd}) ${rest}`;
  if (d.length <= 10) return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`; // fixo / digitando
  return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`; // celular
}

/** Validação no servidor: vazio vira null; senão exige 10 ou 11 dígitos e devolve formatado. */
export const phoneBR = z
  .string()
  .trim()
  .optional()
  .refine((v) => !v || [10, 11].includes(phoneDigits(v).length), "Telefone inválido. Use (19) 99999-9999")
  .transform((v) => (v ? formatPhoneBR(v) : null));
