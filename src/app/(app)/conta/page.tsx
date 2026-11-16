/** Dados da própria conta: nome e celular (editáveis) e troca de senha. */
import { requireSession } from "@/lib/auth/session";
import { PageHeader } from "@/components/layout/page-header";
import { ContaForm } from "./conta-form";

export default async function ContaPage() {
  const s = await requireSession();
  return (
    <>
      <PageHeader title="Minha conta" description={s.email ?? undefined} />
      <ContaForm profile={{ full_name: s.profile.full_name, phone: s.profile.phone ?? "" }} />
    </>
  );
}
