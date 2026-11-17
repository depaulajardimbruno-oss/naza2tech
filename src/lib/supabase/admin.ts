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

/**
 * Diagnóstico seguro (nunca devolve a chave): "ausente", "vazia" ou o tipo detectado.
 * Ajuda a saber se o problema é a variável não existir no deploy ou ter sido salva em branco.
 */
export function adminKeyStatus() {
  const k = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (k === undefined) return "ausente neste deploy";
  if (!k.trim()) return "salva em branco";
  if (k.startsWith("sb_publishable_")) return "é a chave PÚBLICA (publishable), não a secreta";
  if (k.startsWith("sb_secret_")) return "ok (secret key)";
  if (k.startsWith("eyJ")) return "ok (service_role JWT)";
  return "formato não reconhecido";
}
