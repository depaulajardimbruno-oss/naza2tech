/**
 * POLÍTICA DE SENHA (fonte única para tela e servidor).
 *   mínimo 8 caracteres, 1 maiúscula, 1 minúscula, 1 número, 1 caractere especial
 *   + confirmação igual.
 * Vale para: cadastro, trocar senha (Conta, inclusive vindo do "esqueci a senha")
 * e as senhas provisórias geradas pelo ADM (generateStrongPassword).
 * O login NÃO aplica a regra (contas antigas continuam entrando); ela vale na
 * próxima vez que a pessoa definir uma senha.
 */
import { z } from "zod";

export const PASSWORD_RULES = [
  { id: "len", label: "Pelo menos 8 caracteres", test: (s: string) => s.length >= 8 },
  { id: "upper", label: "Uma letra maiúscula", test: (s: string) => /[A-Z]/.test(s) },
  { id: "lower", label: "Uma letra minúscula", test: (s: string) => /[a-z]/.test(s) },
  { id: "digit", label: "Um número", test: (s: string) => /\d/.test(s) },
  { id: "special", label: "Um caractere especial (!@#$%…)", test: (s: string) => /[^A-Za-z0-9]/.test(s) },
] as const;

export const passwordSchema = z
  .string()
  .max(72, "Senha muito longa (máx. 72)")
  .superRefine((s, ctx) => {
    const failed = PASSWORD_RULES.find((r) => !r.test(s));
    if (failed) ctx.addIssue({ code: "custom", message: `A senha precisa ter: ${failed.label.toLowerCase()}.` });
  });

/** Senha + confirmação (campos `password` e `password_confirm`). */
export const passwordWithConfirm = z
  .object({ password: passwordSchema, password_confirm: z.string() })
  .refine((v) => v.password === v.password_confirm, { message: "As senhas não conferem.", path: ["password_confirm"] });

/**
 * Senha provisória forte (12 caracteres) já cumprindo a política.
 * Sem caracteres ambíguos (0/O, 1/l/I) para ditar ou mandar no WhatsApp.
 */
export function generateStrongPassword(length = 12) {
  const upper = "ABCDEFGHJKMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const special = "!@#$%&*?";
  const all = upper + lower + digits + special;
  const rnd = (n: number) => crypto.getRandomValues(new Uint32Array(1))[0] % n;
  const pick = (set: string) => set[rnd(set.length)];
  const chars = [pick(upper), pick(lower), pick(digits), pick(special)];
  while (chars.length < length) chars.push(pick(all));
  // embaralha (Fisher-Yates) para a ordem não ser previsível
  for (let i = chars.length - 1; i > 0; i--) {
    const j = rnd(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}
