/**
 * Encerra a sessão de um usuário INATIVO e manda para o login com aviso.
 * É route handler (e não server component) porque só aqui dá para apagar o cookie.
 * Chamado por requireSession() quando profiles.active = false.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login?erro=inativo", request.url));
}
