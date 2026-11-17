/**
 * Cadastro de PESSOA: campos, validação e opções de select.
 * Fonte única usada pelo formulário (components/people/person-form.tsx)
 * e pelas actions (lib/actions/people.ts). Nada aqui é obrigatório além do nome.
 *
 * Onde cada campo mora no banco:
 *   profiles         -> full_name, nickname, phone        (líderes enxergam)
 *   profile_details  -> todo o resto                      (só a pessoa e o ADM)
 */
import { z } from "zod";
import { phoneBR } from "@/lib/phone";

export const GENDERS = { masculino: "Masculino", feminino: "Feminino" } as const;
export const MARITAL = {
  solteiro: "Solteiro(a)",
  casado: "Casado(a)",
  uniao_estavel: "União estável",
  divorciado: "Divorciado(a)",
  viuvo: "Viúvo(a)",
} as const;
export const UF = "AC AL AM AP BA CE DF ES GO MA MG MS MT PA PB PE PI PR RJ RN RO RR RS SC SE SP TO".split(" ");

const opt = (max = 120) => z.string().trim().max(max).optional().transform((v) => v || null);
const optDate = z
  .string()
  .trim()
  .optional()
  .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), "Data inválida")
  .transform((v) => v || null);

export const personSchema = z.object({
  full_name: z.string().trim().min(3, "Informe o nome completo").max(120),
  nickname: opt(40),
  phone: phoneBR,
  birth_date: optDate,
  gender: z.enum(["masculino", "feminino"]).optional().or(z.literal("")).transform((v) => v || null),
  marital_status: z
    .enum(["solteiro", "casado", "uniao_estavel", "divorciado", "viuvo"])
    .optional()
    .or(z.literal(""))
    .transform((v) => v || null),
  address_zip: opt(9),
  address_street: opt(),
  address_number: opt(10),
  address_complement: opt(60),
  address_district: opt(80),
  address_city: opt(80),
  address_state: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || UF.includes(v.toUpperCase()), "UF inválida")
    .transform((v) => (v ? v.toUpperCase() : null)),
  member_since: optDate,
  baptized: z
    .enum(["sim", "nao"])
    .optional()
    .or(z.literal(""))
    .transform((v) => (v === "sim" ? true : v === "nao" ? false : null)),
  baptism_date: optDate,
  emergency_name: opt(),
  emergency_phone: phoneBR,
});

export type PersonInput = z.infer<typeof personSchema>;

/** Lê o FormData do formulário de pessoa (nomes dos inputs = nomes dos campos). */
export function parsePerson(fd: FormData) {
  const raw: Record<string, string> = {};
  for (const key of Object.keys(personSchema.shape)) raw[key] = String(fd.get(key) ?? "");
  return personSchema.safeParse(raw);
}

/** Separa o que vai para profiles e o que vai para profile_details. */
export function splitPerson(p: PersonInput) {
  const { full_name, nickname, phone, ...details } = p;
  return { profile: { full_name, nickname, phone }, details };
}
