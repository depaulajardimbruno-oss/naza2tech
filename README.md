# Naza2 Tech — Gestão de Ministérios e Escalas

PWA para igrejas: cadastro de ministérios e voluntários, montagem de escalas, confirmação de presença e lembretes automáticos. Substitui o controle por grupos de WhatsApp.

## Stack
Next.js 16 (App Router) · TypeScript · Tailwind 4 · Shadcn/UI · Supabase (Postgres, Auth, RLS, Edge Functions) · Vercel

## Perfis
| Perfil | Acesso |
|---|---|
| ADM | tudo: ministérios, cargos, usuários, eventos, líderes |
| Líder | membros e escalas do(s) ministério(s) que lidera |
| Voluntário | agenda pessoal, escalas publicadas, confirmar / justificar ausência |

## Estrutura
```
src/app/(auth)/login
src/app/(app)/dashboard | minha-agenda | ministerios/[id]
src/app/(app)/lider/[ministryId]/{membros,escalas,pendencias}
src/app/(app)/admin/{ministerios,cargos,usuarios,eventos,lideres}
src/app/api/cron/reminders
src/lib/{supabase,notifications}
supabase/migrations          ← schema, RLS, triggers, RPCs
supabase/functions/send-reminders
```

## Rodando local
```bash
cp .env.example .env.local   # preencha com as chaves do projeto Supabase
npm install
npm run dev
```

## Fases
1. Auth + cadastros base (ministérios, cargos, usuários, membros, líderes)
2. Eventos, escalas, conflitos, confirmação/recusa, dashboards
3. Lembretes (Edge Function + pg_cron), provider WhatsApp/e-mail, PWA
