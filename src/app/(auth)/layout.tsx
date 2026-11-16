/** Layout das telas públicas (login, cadastro): card centralizado, sem menu. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Escalas</h1>
          <p className="text-sm text-muted-foreground">Gestão de ministérios e voluntários</p>
        </div>
        {children}
      </div>
    </main>
  );
}
