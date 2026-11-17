/**
 * Minha conta: a própria pessoa completa o cadastro (mesmo formulário do ADM)
 * e troca a senha. E-mail de login só o ADM altera (regra no banco).
 */
import { requireSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { saveMyPerson } from "@/lib/actions/people";
import { PageHeader } from "@/components/layout/page-header";
import { PersonForm } from "@/components/people/person-form";
import { PasswordCard } from "./conta-form";

export default async function ContaPage() {
  const s = await requireSession();
  const supabase = await createClient();
  const { data: details } = await supabase.from("profile_details").select("*").eq("profile_id", s.userId).maybeSingle();

  return (
    <>
      <PageHeader
        title="Minha conta"
        description={`Você entra com ${s.email ?? "seu e-mail"}. Para trocar o e-mail, fale com o administrador.`}
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <PersonForm person={{ ...s.profile, ...(details ?? {}) }} action={saveMyPerson} />
        <div>
          <PasswordCard />
        </div>
      </div>
    </>
  );
}
