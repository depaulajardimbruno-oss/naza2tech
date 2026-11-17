/** Layout das telas públicas (login, cadastro): marca + card centralizado, sem menu. */
import { Brand } from "@/components/layout/brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <Brand href="/login" size="lg" />
          <div>
            <p className="inline-block rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] tracking-[0.2em] text-blue2">
              ESCALAS DE MINISTÉRIOS
            </p>
            <p className="mt-3 text-sm text-muted-foreground">Uma igreja para toda a família, servindo junto.</p>
          </div>
        </div>
        {children}
      </div>
    </main>
  );
}
