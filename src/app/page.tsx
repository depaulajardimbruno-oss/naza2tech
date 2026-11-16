/** Raiz: o proxy já redireciona (logado -> /dashboard, deslogado -> /login). Fallback aqui. */
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/login");
}
