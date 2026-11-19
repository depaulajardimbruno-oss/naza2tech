/**
 * Recebe as respostas de WhatsApp (Evolution API) e confirma/recusa a escala
 * correspondente, chamando a mesma regra que o botão do site usa
 * (respond_to_schedule_as — variante de respond_to_schedule para quando não
 * há sessão de usuário, só o telefone de quem mandou a mensagem).
 *
 * Autenticado por um segredo na própria URL do webhook (configurado na
 * instância da Evolution API), não por sessão — por isso usa o cliente admin
 * direto, fora do padrão "requireAdmin() antes" de lib/supabase/admin.ts.
 *
 * shortcut: o formato do payload (messages.upsert) é o documentado para
 * Evolution API v2. Confira contra a versão real da instância ao conectar —
 * outras versões/providers podem mandar o texto ou o remetente em outro campo.
 */
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWhatsApp } from "@/lib/whatsapp";
import { phoneDigits } from "@/lib/phone";

const CONFIRM_WORDS = ["sim", "confirmo", "confirmar", "vou", "ok", "certo", "pode confirmar"];
const DECLINE_WORDS = ["nao", "não", "nao posso", "não posso", "nao vou", "não vou", "cancelar"];

function normalize(text: string) {
  return text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("token") !== process.env.EVOLUTION_WEBHOOK_SECRET || !process.env.EVOLUTION_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const data = body?.data;
  if (!data || data.key?.fromMe) return NextResponse.json({ ok: true }); // ignora eco do próprio bot

  const remoteJid: string | undefined = data.key?.remoteJid;
  const text: string | undefined = data.message?.conversation ?? data.message?.extendedTextMessage?.text;
  if (!remoteJid || !text) return NextResponse.json({ ok: true });

  const digits = phoneDigits(remoteJid.split("@")[0]);
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ ok: true });

  // Telefone não tem índice normalizado; como a equipe é pequena, filtra por
  // sufixo e confere os dígitos em código — suficiente para esse volume.
  const { data: candidates } = await admin.from("profiles").select("id, phone").ilike("phone", `%${digits.slice(-8)}%`);
  const profile = candidates?.find((p) => phoneDigits(p.phone ?? "") === digits);
  if (!profile) return NextResponse.json({ ok: true });

  const normalized = normalize(text);
  const isConfirm = CONFIRM_WORDS.includes(normalized);
  const isDecline = DECLINE_WORDS.includes(normalized);
  if (!isConfirm && !isDecline) {
    await sendWhatsApp(remoteJid, "Não entendi — responda *SIM* para confirmar ou *NAO* se não puder ir.");
    return NextResponse.json({ ok: true });
  }

  const { data: pending } = await admin
    .from("schedules")
    .select("id, ministry_id, member:ministry_members!inner(profile_id)")
    .eq("member.profile_id", profile.id)
    .eq("status", "pendente")
    .eq("published", true)
    .order("created_at", { ascending: false })
    .limit(1);
  const schedule = pending?.[0];
  if (!schedule) {
    await sendWhatsApp(remoteJid, "Não encontrei nenhuma escala sua aguardando resposta no momento.");
    return NextResponse.json({ ok: true });
  }

  // shortcut: any até a migration 20261118210000 ser aplicada e os tipos
  // regenerados (respond_to_schedule_as ainda não existe em types/database.ts).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rpc = admin.rpc.bind(admin) as unknown as (fn: string, args: object) => Promise<{ error: any }>;
  const { error } = await rpc("respond_to_schedule_as", {
    p_profile_id: profile.id,
    p_schedule_id: schedule.id,
    p_status: isConfirm ? "confirmado" : "recusado",
    p_reason: isConfirm ? null : "Respondido via WhatsApp (sem motivo detalhado)",
    p_swap: false,
  });

  await sendWhatsApp(
    remoteJid,
    error ? "Não consegui registrar sua resposta agora, tente pelo site." : isConfirm ? "Prontinho, presença confirmada! ✅" : "Ok, avisei o líder. 🙏"
  );

  if (!error) {
    revalidatePath(`/lider/${schedule.ministry_id}/pendencias`);
    revalidatePath("/minha-agenda");
    revalidatePath("/agenda");
    revalidatePath("/dashboard");
  }
  return NextResponse.json({ ok: true });
}
