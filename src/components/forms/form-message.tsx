/** Mostra erro (vermelho) ou sucesso (verde) retornado por uma server action. */
export function FormMessage({ error, ok }: { error?: string; ok?: string }) {
  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (ok) return <p className="text-sm text-success">{ok}</p>;
  return null;
}
