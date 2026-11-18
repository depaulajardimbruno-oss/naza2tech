"use server";
/**
 * IMPORTAR VOLUNTÁRIOS (só ADM) — a partir de um CSV (ver /admin/importar).
 *
 * Por linha (nome;telefone;nascimento;funcoes;emergencia_nome;emergencia_telefone):
 *   - pessoa JÁ existe (mesmo telefone em profiles)  -> só vincula ao ministério/funções;
 *   - pessoa nova -> cria a conta (e-mail sintético do telefone, senha provisória gerada
 *     aqui e devolvida UMA vez para o ADM baixar; nada é guardado em texto puro);
 *   - nascimento sem ano ("31/05") -> grava ano 1904 (o banco marca birth_year_unknown);
 *   - funções (separadas por "|") viram ministry_member_roles; a 1ª vira o cargo principal.
 * Nunca apaga nem sobrescreve dado existente. O front envia em lotes pequenos (timeout da Vercel).
 */
import { requireAdmin } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { phoneBR } from "@/lib/phone";
import { phoneToLoginEmail } from "@/lib/login-id";
import { generateStrongPassword } from "@/lib/password";

export type ImportRow = {
  nome: string;
  telefone: string;
  nascimento: string;
  funcoes: string;
  /** Opcionais: contato de emergência (ex.: "Mãe" + telefone). Não sobrescreve o que já existe. */
  emergencia_nome?: string;
  emergencia_telefone?: string;
};
export type ImportResult = {
  nome: string;
  status: "criado" | "vinculado" | "erro";
  login?: string; // telefone formatado
  senha?: string; // só para contas novas
  avisos: string[];
};

/** "31/05" ou "31/05/1990" -> "YYYY-MM-DD" (ano 1904 quando não há ano). */
function parseBirth(v: string): string | null {
  const m = v.trim().match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/);
  if (!m) return null;
  const [d, mo, y] = [Number(m[1]), Number(m[2]), m[3] ? Number(m[3]) : 1904];
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return null;
  return `${String(y).padStart(4, "0")}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export async function importVolunteers(ministryId: string, rows: ImportRow[]): Promise<{ error?: string; results?: ImportResult[] }> {
  await requireAdmin();
  const admin = createAdminClient();
  if (!admin) return { error: "Falta configurar SUPABASE_SERVICE_ROLE_KEY na Vercel." };
  if (rows.length > 15) return { error: "Lote grande demais (máx. 15 linhas)." };

  const { data: roles } = await admin.from("ministry_roles").select("id, name").eq("ministry_id", ministryId);
  const roleByName = new Map((roles ?? []).map((r) => [r.name.trim().toLowerCase(), r.id]));

  const results: ImportResult[] = [];
  for (const row of rows) {
    const avisos: string[] = [];
    const nome = row.nome.trim().replace(/\s+/g, " ");
    try {
      const tel = phoneBR.safeParse(row.telefone);
      if (!nome || !tel.success || !tel.data) {
        results.push({ nome: nome || "(sem nome)", status: "erro", avisos: ["Nome ou telefone inválido — linha ignorada."] });
        continue;
      }
      const phone = tel.data;

      // ---- conta: existente (mesmo telefone) ou nova ----
      const { data: found } = await admin.from("profiles").select("id").eq("phone", phone);
      let profileId: string | undefined;
      let senha: string | undefined;
      if (found && found.length > 1) {
        results.push({ nome, status: "erro", login: phone, avisos: ["Mais de uma conta com esse telefone — resolva manualmente."] });
        continue;
      }
      if (found?.length === 1) profileId = found[0].id;
      else {
        senha = generateStrongPassword();
        const { data, error } = await admin.auth.admin.createUser({
          email: phoneToLoginEmail(phone),
          password: senha,
          email_confirm: true,
          user_metadata: { full_name: nome, phone },
        });
        if (error) {
          results.push({ nome, status: "erro", login: phone, avisos: [error.message] });
          continue;
        }
        profileId = data.user.id;
        await admin.from("profiles").update({ full_name: nome, phone }).eq("id", profileId);
      }

      // ---- aniversário (não sobrescreve o que já existe) ----
      const birth = row.nascimento.trim() ? parseBirth(row.nascimento) : null;
      if (row.nascimento.trim() && !birth) avisos.push(`Nascimento "${row.nascimento}" não reconhecido.`);
      if (birth) {
        const { data: det } = await admin.from("profile_details").select("birth_date").eq("profile_id", profileId).maybeSingle();
        if (!det?.birth_date) await admin.from("profile_details").upsert({ profile_id: profileId, birth_date: birth });
      }

      // ---- contato de emergência (não sobrescreve) ----
      if (row.emergencia_nome?.trim() || row.emergencia_telefone?.trim()) {
        const emTel = phoneBR.safeParse(row.emergencia_telefone ?? "");
        if (!emTel.success) avisos.push("Telefone de emergência inválido — ignorado.");
        else {
          const { data: det } = await admin
            .from("profile_details")
            .select("emergency_name, emergency_phone")
            .eq("profile_id", profileId)
            .maybeSingle();
          if (!det?.emergency_name && !det?.emergency_phone)
            await admin.from("profile_details").upsert({
              profile_id: profileId,
              emergency_name: row.emergencia_nome?.trim() || null,
              emergency_phone: emTel.data,
            });
        }
      }

      // ---- ministério + funções ----
      const { error: mErr } = await admin
        .from("ministry_members")
        .upsert({ profile_id: profileId, ministry_id: ministryId }, { onConflict: "profile_id,ministry_id", ignoreDuplicates: true });
      if (mErr) throw new Error(mErr.message);
      const { data: member } = await admin
        .from("ministry_members")
        .select("id, ministry_role_id")
        .eq("profile_id", profileId)
        .eq("ministry_id", ministryId)
        .single();

      const roleIds: string[] = [];
      for (const f of row.funcoes.split("|").map((x) => x.trim()).filter(Boolean)) {
        const id = roleByName.get(f.toLowerCase());
        if (id) roleIds.push(id);
        else avisos.push(`Função "${f}" não existe no ministério — ignorada.`);
      }
      if (member && roleIds.length) {
        await admin
          .from("ministry_member_roles")
          .upsert(roleIds.map((r) => ({ ministry_member_id: member.id, ministry_role_id: r })), {
            onConflict: "ministry_member_id,ministry_role_id",
            ignoreDuplicates: true,
          });
        if (!member.ministry_role_id) await admin.from("ministry_members").update({ ministry_role_id: roleIds[0] }).eq("id", member.id);
      }

      results.push({ nome, status: senha ? "criado" : "vinculado", login: phone, senha, avisos });
    } catch (e) {
      results.push({ nome, status: "erro", avisos: [e instanceof Error ? e.message : "Erro inesperado"] });
    }
  }
  return { results };
}

