/**
 * Proxy do Next 16 (substitui o antigo middleware.ts).
 * Delega toda a lógica para src/lib/supabase/proxy.ts.
 * O matcher exclui assets estáticos para não rodar à toa.
 */
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest|icons|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
