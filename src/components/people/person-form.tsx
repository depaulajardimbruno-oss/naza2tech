"use client";
/**
 * Formulário de CADASTRO DE PESSOA (só o nome é obrigatório).
 * Usado na página Conta (a própria pessoa) e no painel do ADM (/admin/usuarios/[id]).
 * Recebe a action pronta; `hidden` permite mandar campos extras (ex.: profile_id).
 * CEP: ao sair do campo, busca o endereço na ViaCEP (viacep.com.br) e preenche.
 */
import { useActionState, useRef } from "react";
import type { ActionState } from "@/lib/actions/types";
import type { Tables } from "@/types/database";
import { GENDERS, MARITAL, UF } from "@/lib/people/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/select";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormMessage } from "@/components/forms/form-message";
import { PhoneInput } from "@/components/forms/phone-input";

export type PersonData = Pick<Tables<"profiles">, "full_name" | "nickname" | "phone"> &
  Partial<Omit<Tables<"profile_details">, "profile_id" | "updated_at">>;

type Action = (prev: ActionState, fd: FormData) => Promise<ActionState>;

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export function PersonForm({ person, action, hidden }: { person: PersonData; action: Action; hidden?: Record<string, string> }) {
  const [state, formAction] = useActionState<ActionState, FormData>(action, {});
  const form = useRef<HTMLFormElement>(null);
  const v = (x: string | null | undefined) => x ?? "";

  async function fillFromCep(cep: string) {
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8 || !form.current) return;
    try {
      const r = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const d = await r.json();
      if (d.erro) return;
      const set = (name: string, value: string) => {
        const el = form.current?.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null;
        if (el && !el.value) el.value = value; // não sobrescreve o que a pessoa já digitou
      };
      set("address_street", d.logradouro ?? "");
      set("address_district", d.bairro ?? "");
      set("address_city", d.localidade ?? "");
      set("address_state", d.uf ?? "");
    } catch {
      /* sem internet / ViaCEP fora: segue manual */
    }
  }

  return (
    <form ref={form} action={formAction} className="space-y-6">
      {hidden && Object.entries(hidden).map(([k, val]) => <input key={k} type="hidden" name={k} value={val} />)}

      <Card>
        <CardHeader>
          <CardTitle>Identificação</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome completo *" className="sm:col-span-2">
            <Input name="full_name" defaultValue={person.full_name} required />
          </Field>
          <Field label="Como prefere ser chamado(a)">
            <Input name="nickname" defaultValue={v(person.nickname)} />
          </Field>
          <Field label="Data de nascimento">
            <Input name="birth_date" type="date" defaultValue={v(person.birth_date)} />
          </Field>
          <Field label="Sexo">
            <NativeSelect name="gender" defaultValue={v(person.gender)}>
              <option value="">—</option>
              {Object.entries(GENDERS).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Estado civil">
            <NativeSelect name="marital_status" defaultValue={v(person.marital_status)}>
              <option value="">—</option>
              {Object.entries(MARITAL).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contato</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="WhatsApp">
            <PhoneInput name="phone" defaultValue={v(person.phone)} />
          </Field>
          <div className="hidden sm:block" />
          <Field label="Contato de emergência (nome)">
            <Input name="emergency_name" defaultValue={v(person.emergency_name)} />
          </Field>
          <Field label="Telefone de emergência">
            <PhoneInput name="emergency_phone" defaultValue={v(person.emergency_phone)} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Endereço</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-6">
          <Field label="CEP" className="sm:col-span-2">
            <Input
              name="address_zip"
              inputMode="numeric"
              defaultValue={v(person.address_zip)}
              placeholder="13000-000"
              onBlur={(e) => fillFromCep(e.currentTarget.value)}
            />
          </Field>
          <Field label="Rua" className="sm:col-span-4">
            <Input name="address_street" defaultValue={v(person.address_street)} />
          </Field>
          <Field label="Número" className="sm:col-span-2">
            <Input name="address_number" defaultValue={v(person.address_number)} />
          </Field>
          <Field label="Complemento" className="sm:col-span-4">
            <Input name="address_complement" defaultValue={v(person.address_complement)} />
          </Field>
          <Field label="Bairro" className="sm:col-span-2">
            <Input name="address_district" defaultValue={v(person.address_district)} />
          </Field>
          <Field label="Cidade" className="sm:col-span-3">
            <Input name="address_city" defaultValue={v(person.address_city)} />
          </Field>
          <Field label="UF" className="sm:col-span-1">
            <NativeSelect name="address_state" defaultValue={v(person.address_state)}>
              <option value="">—</option>
              {UF.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vida na igreja</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <Field label="Membro desde">
            <Input name="member_since" type="date" defaultValue={v(person.member_since)} />
          </Field>
          <Field label="Batizado(a)?">
            <NativeSelect
              name="baptized"
              defaultValue={person.baptized === true ? "sim" : person.baptized === false ? "nao" : ""}
            >
              <option value="">—</option>
              <option value="sim">Sim</option>
              <option value="nao">Não</option>
            </NativeSelect>
          </Field>
          <Field label="Data do batismo">
            <Input name="baptism_date" type="date" defaultValue={v(person.baptism_date)} />
          </Field>
        </CardContent>
      </Card>

      <div className="flex items-center gap-4">
        <SubmitButton>Salvar cadastro</SubmitButton>
        <FormMessage error={state.error} ok={state.ok} />
      </div>
    </form>
  );
}
