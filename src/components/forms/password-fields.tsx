"use client";
/**
 * Campos "Senha" + "Confirmar senha" com checklist ao vivo da política
 * (lib/password.ts). Os nomes dos campos são `password` e `password_confirm`.
 * O servidor valida de novo — a checklist é só para ajudar quem digita.
 */
import { useState } from "react";
import { CheckIcon, EyeIcon, EyeOffIcon, XIcon } from "lucide-react";
import { PASSWORD_RULES } from "@/lib/password";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function PasswordFields({ label = "Senha" }: { label?: string }) {
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const type = show ? "text" : "password";

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="password">{label}</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={type}
            autoComplete="new-password"
            required
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={show ? "Esconder senha" : "Mostrar senha"}
          >
            {show ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
          </button>
        </div>
      </div>

      <ul className="grid gap-1 text-xs sm:grid-cols-2">
        {PASSWORD_RULES.map((r) => {
          const ok = r.test(pw);
          return (
            <li key={r.id} className={cn("flex items-center gap-1.5", ok ? "text-success" : "text-muted-foreground")}>
              {ok ? <CheckIcon className="size-3.5" /> : <XIcon className="size-3.5" />} {r.label}
            </li>
          );
        })}
      </ul>

      <div className="space-y-2">
        <Label htmlFor="password_confirm">Confirmar senha</Label>
        <Input
          id="password_confirm"
          name="password_confirm"
          type={type}
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        {confirm.length > 0 && (
          <p className={cn("text-xs", confirm === pw ? "text-success" : "text-destructive")}>
            {confirm === pw ? "As senhas conferem." : "As senhas não conferem."}
          </p>
        )}
      </div>
    </div>
  );
}
