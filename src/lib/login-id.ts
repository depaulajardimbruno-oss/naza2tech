/**
 * "Chave de acesso" = TELEFONE ou E-MAIL.
 *
 * O Supabase Auth só entende e-mail. Para quem ainda não tem e-mail, criamos a conta
 * com um e-mail SINTÉTICO derivado do telefone (11 dígitos @ LOGIN_DOMAIN). Ele nunca
 * recebe mensagem (".invalid" é um domínio reservado que não existe) e NÃO deve aparecer
 * na tela: use displayEmail(). Quando a pessoa tiver e-mail real, o ADM troca em
 * /admin/usuarios/[id] e o login por telefone continua funcionando (o app procura o
 * perfil pelo telefone e entra com o e-mail que estiver cadastrado).
 */
import { formatPhoneBR, phoneDigits } from "./phone";

export const LOGIN_DOMAIN = "telefone.naza2.invalid";

/** (19) 99999-9999 -> 19999999999@telefone.naza2.invalid */
export const phoneToLoginEmail = (phone: string) => `${phoneDigits(phone)}@${LOGIN_DOMAIN}`;

export const isPlaceholderEmail = (email: string | null | undefined) =>
  !!email && email.toLowerCase().endsWith(`@${LOGIN_DOMAIN}`);

/** E-mail para mostrar na tela (esconde o sintético). */
export const displayEmail = (email: string | null | undefined) => (isPlaceholderEmail(email) ? null : (email ?? null));

/** Texto digitado no login: tem "@" => e-mail; senão tenta telefone (10 ou 11 dígitos). */
export function parseLoginId(raw: string): { kind: "email"; email: string } | { kind: "phone"; phone: string } | null {
  const v = raw.trim();
  if (v.includes("@")) return { kind: "email", email: v.toLowerCase() };
  const d = phoneDigits(v);
  return [10, 11].includes(d.length) ? { kind: "phone", phone: formatPhoneBR(d) } : null;
}
