/**
 * Cliente Supabase para o NAVEGADOR (componentes "use client").
 *
 * Usa a chave pública (anon/publishable). Toda a segurança vem do RLS no
 * banco: este cliente só enxerga o que as policies permitem ao usuário logado.
 * Para leitura em Server Components e server actions use ./server.ts.
 */
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
