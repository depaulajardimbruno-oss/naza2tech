/**
 * Importar voluntários de um CSV para um ministério (só ADM).
 * Formato: nome;telefone;nascimento;funcoes[;emergencia_nome;emergencia_telefone]   (funções separadas por "|")
 * A leitura do arquivo acontece no navegador; a gravação, em lotes, em lib/actions/import.ts.
 */
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/session";
import { adminClientConfigured } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/layout/page-header";
import { ImportVolunteers } from "@/components/users/import-volunteers";

export default async function ImportarPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data: ministries } = await supabase.from("ministries").select("id, name").eq("is_active", true).order("name");
  return (
    <>
      <PageHeader
        title="Importar voluntários"
        description="Cria as contas (entrada pelo telefone), vincula ao ministério e registra as funções. Quem já tem conta só é vinculado."
      />
      {!adminClientConfigured() && (
        <p className="mb-4 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
          Falta a variável <code>SUPABASE_SERVICE_ROLE_KEY</code> na Vercel.
        </p>
      )}
      <ImportVolunteers ministries={ministries ?? []} />
    </>
  );
}
