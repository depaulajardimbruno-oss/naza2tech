/**
 * Renovação de sessão no proxy (antigo middleware).
 *
 * O token de acesso do Supabase expira em ~1h. Esta função roda em TODA
 * requisição de página (ver src/proxy.ts), pede ao Supabase o usuário atual
 * (o que renova o token se necessário) e repassa os cookies atualizados
 * para a resposta. Também faz o redirecionamento básico:
 *   - sem sessão e fora de /login, /cadastro  -> /login
 *   - com sessão em /login ou /cadastro        -> /dashboard
 *
 * Checagem de PERFIL (admin / líder) NÃO é feita aqui: fica nos layouts,
 * que têm acesso ao banco. Aqui só sabemos se há usuário ou não.
 */
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/cadastro", "/recuperar-senha", "/auth"];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANTE: não colocar lógica entre createServerClient e getUser(),
  // senão a renovação do token pode não acontecer.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Webhook do WhatsApp (Evolution API): chamado por servidor, sem sessão.
  // A autenticação é feita na própria rota via ?token=.
  if (pathname.startsWith("/api/whatsapp/webhook")) {
    return supabaseResponse;
  }

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!user && !isPublic && pathname !== "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && (isPublic || pathname === "/") && !pathname.startsWith("/auth")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
