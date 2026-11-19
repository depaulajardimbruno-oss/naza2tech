// Lembrete de escala 24h antes do evento, via WhatsApp (Evolution API).
// Chamado por pg_cron de hora em hora (ver migration da Fase 3). Protegido por
// CRON_SECRET para não virar um endpoint público que qualquer um pode disparar.
//
// shortcut: o payload do sendText segue a Evolution API v2 ({ number, text },
// header apikey). Confira contra a versão real da instância ao conectar.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const cronSecret = Deno.env.get("CRON_SECRET");
  const auth = req.headers.get("authorization") ?? "";
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return new Response("unauthorized", { status: 401 });
  }

  const evolutionUrl = Deno.env.get("EVOLUTION_API_URL");
  const evolutionKey = Deno.env.get("EVOLUTION_API_KEY");
  const evolutionInstance = Deno.env.get("EVOLUTION_INSTANCE");
  if (!evolutionUrl || !evolutionKey || !evolutionInstance) {
    return new Response("WhatsApp não configurado", { status: 200 });
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Eventos entre 23h e 25h a partir de agora: a janela cobre a margem de
  // uma hora entre execuções do cron, sem lembrar o mesmo evento duas vezes
  // (checado abaixo pelo notification_log, que é a trava definitiva).
  const now = new Date();
  const from = new Date(now.getTime() + 23 * 3600_000);
  const to = new Date(now.getTime() + 25 * 3600_000);
  const fromDate = from.toISOString().slice(0, 10);
  const toDate = to.toISOString().slice(0, 10);

  const { data: schedules, error } = await supabase
    .from("schedules")
    .select(
      "id, member:ministry_members(profile:profiles(phone, full_name)), role:ministry_roles(name), event:events(title, event_date, start_time), ministry:ministries(name)"
    )
    .eq("published", true)
    .in("status", ["pendente", "confirmado"])
    .gte("event.event_date", fromDate)
    .lte("event.event_date", toDate);

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  const { data: already } = await supabase.from("notification_log").select("schedule_id").eq("kind", "24h");
  const sentIds = new Set((already ?? []).map((r) => r.schedule_id));

  let sent = 0;
  for (const s of schedules ?? []) {
    if (sentIds.has(s.id) || !s.event) continue;
    const starts = new Date(`${s.event.event_date}T${s.event.start_time}`);
    const hoursUntil = (starts.getTime() - now.getTime()) / 3600_000;
    if (hoursUntil < 23 || hoursUntil > 25) continue; // o range do .lte/.gte acima é por dia, não por hora

    const phone = s.member?.profile?.phone;
    if (!phone) continue;
    const digits = phone.replace(/\D/g, "");
    const first = (s.member?.profile?.full_name ?? "").split(" ")[0];
    const text = `Lembrete${first ? ", " + first : ""}: amanhã você está escalado(a) em *${s.event.title}* às ${s.event.start_time.slice(0, 5)} (${s.ministry?.name ?? ""} · ${s.role?.name ?? ""}).`;

    let ok = false;
    let err: string | null = null;
    try {
      const r = await fetch(`${evolutionUrl}/message/sendText/${evolutionInstance}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: evolutionKey },
        body: JSON.stringify({ number: `55${digits}`, text }),
      });
      ok = r.ok;
      if (!ok) err = `HTTP ${r.status}`;
    } catch (e) {
      err = e instanceof Error ? e.message : "erro desconhecido";
    }

    await supabase.from("notification_log").insert({ schedule_id: s.id, kind: "24h", channel: "whatsapp", ok, error: err });
    if (ok) sent++;
  }

  return new Response(JSON.stringify({ checked: schedules?.length ?? 0, sent }), {
    headers: { "Content-Type": "application/json" },
  });
});
