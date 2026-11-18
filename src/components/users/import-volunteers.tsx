"use client";
/**
 * Tela de importação: escolhe o ministério + CSV (nome;telefone;nascimento;funcoes),
 * mostra uma prévia, envia em lotes de 10 e, ao final, oferece o CSV com as senhas
 * provisórias (geradas só agora; não ficam guardadas em lugar nenhum).
 */
import { useState } from "react";
import { DownloadIcon } from "lucide-react";
import { toast } from "sonner";
import { importVolunteers, type ImportResult, type ImportRow } from "@/lib/actions/import";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/select";

const BATCH = 10;

/** CSV simples (separador ; ou ,), com cabeçalho na 1ª linha. Aspas duplas suportadas. */
function parseCsv(text: string): ImportRow[] {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const sep = lines[0].includes(";") ? ";" : ",";
  const split = (l: string) => {
    const out: string[] = [];
    let cur = "", q = false;
    for (const ch of l) {
      if (ch === '"') q = !q;
      else if (ch === sep && !q) { out.push(cur); cur = ""; }
      else cur += ch;
    }
    out.push(cur);
    return out.map((c) => c.trim());
  };
  const head = split(lines[0]).map((h) => h.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""));
  const idx = (k: string) => head.findIndex((h) => h.startsWith(k));
  const [iN, iT, iB, iF] = [idx("nome"), idx("telefone"), idx("nasc"), idx("funcoes")];
  if (iN < 0 || iT < 0) return [];
  return lines.slice(1).map((l) => {
    const c = split(l);
    return { nome: c[iN] ?? "", telefone: c[iT] ?? "", nascimento: iB >= 0 ? (c[iB] ?? "") : "", funcoes: iF >= 0 ? (c[iF] ?? "") : "" };
  });
}

export function ImportVolunteers({ ministries }: { ministries: { id: string; name: string }[] }) {
  const [ministryId, setMinistryId] = useState("");
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [busy, setBusy] = useState(false);

  async function onFile(file: File | undefined) {
    setResults([]);
    if (!file) return setRows([]);
    const parsed = parseCsv(await file.text());
    if (!parsed.length) toast.error("Não consegui ler o arquivo. Use o formato nome;telefone;nascimento;funcoes.");
    setRows(parsed);
  }

  async function run() {
    setBusy(true);
    const all: ImportResult[] = [];
    for (let i = 0; i < rows.length; i += BATCH) {
      const r = await importVolunteers(ministryId, rows.slice(i, i + BATCH));
      if (r.error) {
        toast.error(r.error);
        break;
      }
      all.push(...(r.results ?? []));
      setResults([...all]);
    }
    setBusy(false);
    if (all.length) toast.success(`Importação concluída: ${all.length} linha(s) processada(s).`);
  }

  function downloadPasswords() {
    const csv = ["nome;telefone;senha_provisoria", ...results.filter((r) => r.senha).map((r) => `${r.nome};${r.login};${r.senha}`)].join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    a.download = "senhas-provisorias.csv";
    a.click();
  }

  const count = (s: ImportResult["status"]) => results.filter((r) => r.status === s).length;
  const warned = results.filter((r) => r.avisos.length);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>1. Escolha o ministério e o arquivo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <NativeSelect value={ministryId} onChange={(e) => setMinistryId(e.target.value)} aria-label="Ministério" className="max-w-xs">
            <option value="">Ministério…</option>
            {ministries.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </NativeSelect>
          <input type="file" accept=".csv,text/csv" onChange={(e) => onFile(e.target.files?.[0])} className="block text-sm" />
          {rows.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {rows.length} linha(s) lida(s). Exemplo: {rows[0].nome} · {rows[0].telefone} · {rows[0].funcoes || "sem função"}
            </p>
          )}
          <Button onClick={run} disabled={busy || !ministryId || !rows.length}>
            {busy ? `Importando… ${results.length}/${rows.length}` : "Importar"}
          </Button>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Resultado: {count("criado")} criado(s) · {count("vinculado")} já tinha(m) conta · {count("erro")} com erro
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {count("criado") > 0 && (
              <div className="space-y-1">
                <Button variant="outline" onClick={downloadPasswords}>
                  <DownloadIcon /> Baixar senhas provisórias (CSV)
                </Button>
                <p className="text-xs text-muted-foreground">
                  Só dá para baixar agora — não ficam guardadas. Envie a cada pessoa (telefone + senha) e apague o arquivo.
                  Depois de entrar, cada um troca a senha em Conta.
                </p>
              </div>
            )}
            {warned.length > 0 && (
              <ul className="list-disc space-y-1 pl-5">
                {warned.map((r, i) => (
                  <li key={i}>
                    <strong>{r.nome}</strong>: {r.avisos.join(" ")}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
