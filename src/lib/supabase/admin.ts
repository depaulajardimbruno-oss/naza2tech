/**
 * Cliente Supabase com a SERVICE ROLE KEY (ignora RLS). SÓ NO SERVIDOR.
 *
 * Usado apenas para o que o usuário logado não consegue fazer sozinho,
 * como o ADM criar a conta de outra pessoa (auth.admin.createUser).
 * - `import "server-only"` faz o build falhar se alguém importar isto num client component.
 * - A chave fica na Vercel (Settings → Environment Variables), nunca no repositório.
 * - Toda action que usa este cliente DEVE chamar requireAdmin() antes.
 */
import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/** Retorna null se a chave não estiver configurada (a tela mostra um aviso). */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const adminClientConfigured = () => !!process.env.SUPABASE_SERVICE_ROLE_KEY;
