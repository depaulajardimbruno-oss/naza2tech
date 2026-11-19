/**
 * Envio de WhatsApp via Evolution API (gateway self-hosted sobre um número real,
 * não a API oficial da Meta — ver .env.example: EVOLUTION_API_URL/KEY/INSTANCE).
 * Sem efeito se NOTIFY_PROVIDER não for "whatsapp" ou faltar configurar (dev local).
 *
 * shortcut: o payload do sendText é o documentado para Evolution API v2
 * ({ number, text }, header apikey). Confira contra a versão real da instância
 * ao conectar — outras versões podem esperar um formato levemente diferente.
 */
import "server-only";
import { phoneDigits } from "@/lib/phone";

export function whatsappConfigured() {
  return (
    process.env.NOTIFY_PROVIDER === "whatsapp" &&
    !!process.env.EVOLUTION_API_URL &&
    !!process.env.EVOLUTION_API_KEY &&
    !!process.env.EVOLUTION_INSTANCE
  );
}

export async function sendWhatsApp(phone: string, text: string): Promise<{ ok: boolean; error?: string }> {
  if (!whatsappConfigured()) return { ok: false, error: "WhatsApp não configurado" };
  const digits = phoneDigits(phone);
  if (digits.length < 10) return { ok: false, error: "Telefone inválido" };
  try {
    const r = await fetch(`${process.env.EVOLUTION_API_URL}/message/sendText/${process.env.EVOLUTION_INSTANCE}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: process.env.EVOLUTION_API_KEY! },
      body: JSON.stringify({ number: `55${digits}`, text }),
    });
    if (!r.ok) return { ok: false, error: `HTTP ${r.status}: ${await r.text().catch(() => "")}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro desconhecido" };
  }
}
