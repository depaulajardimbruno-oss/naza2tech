/** Página de login. `?next=` guarda a rota que o usuário tentou abrir deslogado. */
import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, erro } = await searchParams;
  return (
    <LoginForm
      next={typeof next === "string" ? next : undefined}
      initialError={
        erro === "link-invalido"
          ? "Link inválido ou expirado."
          : erro === "inativo"
            ? "Seu acesso está desativado. Fale com o administrador ou com o líder do seu ministério."
            : undefined
      }
    />
  );
}
