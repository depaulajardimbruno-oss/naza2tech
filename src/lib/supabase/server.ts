/**
 * Cliente Supabase para o SERVIDOR (Server Components, server actions, route handlers).
 *
 * A sessão do usuário vive em cookies; este cliente lê e grava esses cookies
 * usando a API `cookies()` do Next. Em Server Components a escrita de cookie
 * falha (é read-only lá), por isso o try/catch: o proxy.ts já renovou a
 * sessão antes, então ignorar o erro é seguro.
 *
 * Sempre crie um cliente novo por requisição (nunca guarde em variável global).
 */
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Chamado de um Server Component: cookies são read-only aqui.
          }
        },
      },
    }
  );
}
