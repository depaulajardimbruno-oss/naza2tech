# Naza2 Tech — Gestão de Ministérios e Escalas

PWA para igrejas: cadastro de ministérios e voluntários, montagem de escalas, confirmação de presença e lembretes automáticos. Substitui o controle por grupos de WhatsApp.

## Stack
Next.js 16 (App Router, `proxy.ts`) · TypeScript · Tailwind 4 · componentes no padrão shadcn/ui · Supabase (Postgres, Auth, RLS) · Vercel

## Perfis e permissões
| Perfil | Como vira | Acesso |
|---|---|---|
| **ADM** | `profiles.role_global = 'admin'` (outro ADM marca em /admin/usuarios) | tudo |
| **Líder** | `ministry_members.is_leader = true` (só ADM marca) | membros e escalas do(s) ministério(s) que lidera |
| **Voluntário** | qualquer cadastro | agenda pessoal, escalas publicadas, confirmar/recusar |

A segurança real é o **RLS no banco** (`supabase/migrations`). O menu e os `require*()` em `src/lib/auth/session.ts` são a segunda camada; servem para UX e para não bater no banco à toa.

## Mapa do código
```
src/
├─ proxy.ts                      renova a sessão em toda request e redireciona deslogados (ex-middleware)
├─ app/
│  ├─ (auth)/                    login, cadastro, recuperar-senha (sem menu)
│  ├─ auth/callback/             troca o code dos links de e-mail por sessão
│  └─ (app)/                     área logada; layout.tsx monta o menu por perfil
│     ├─ dashboard/              resumo (Fase 2: próximas escalas / pendências)
│     ├─ minha-agenda/           escalas do voluntário (Fase 2)
│     ├─ ministerios/[id]/       visão de membro: equipe e escala
│     ├─ lider/[ministryId]/     guard requireLeaderOf; abas membros | escalas | pendências
│     ├─ admin/                  guard requireAdmin; ministérios (+cargos +equipe), usuários, eventos
│     └─ conta/                  dados pessoais e senha
├─ components/
│  ├─ ui/                        button, input, card, table, dialog... (padrão shadcn, escritos à mão)
│  ├─ forms/                     SubmitButton, FormMessage, ActionSwitch/Button/Select (ligam UI a server actions)
│  ├─ members/                   AddMemberForm e MembersTable, usados por ADM e líder
│  └─ layout/                    AppShell (sidebar + barra mobile), PageHeader, EmptyState
├─ lib/
│  ├─ supabase/                  client.ts (browser) · server.ts (RSC/actions) · proxy.ts (sessão)
│  ├─ auth/                      session.ts (getSession/require*) · actions.ts (signIn/signUp/signOut)
│  └─ actions/                   server actions por domínio: ministries, members, users
└─ types/database.ts             tipos gerados do schema (regenerar após cada migration)
supabase/
├─ migrations/                   schema, RLS, triggers, RPCs (aplicadas no projeto gxbowilntkmeveejeecg)
└─ functions/send-reminders/     Edge Function de lembretes (Fase 3)
```

## Convenções
- **Server actions** ficam em `src/lib/actions/<dominio>.ts` (ou `actions.ts` ao lado da página quando são locais). Toda action chama `requireAdmin()` / `requireLeaderOf()` antes de tocar no banco e devolve `{ error?, ok? }`.
- **Formulários** usam `useActionState` + `<SubmitButton>` + `<FormMessage>`. Controles soltos (switch, select na tabela) usam `ActionSwitch` / `ActionSelect` / `ActionButton`, que mostram toast.
- **Cabeçalho em todo arquivo** explicando o que ele faz e por quê. Mantenha.
- Componentes de UI seguem a API do shadcn: `npx shadcn add <nome>` no seu PC funciona e cai em `src/components/ui`.
- Depois de uma migration, regenere `src/types/database.ts`.

## Rodando local
```bash
cp .env.example .env.local   # já vem com URL e chave pública do projeto
npm install
npm run dev                  # http://localhost:3000
```

## Primeiro acesso
1. Cadastre-se em `/cadastro` e confirme o e-mail.
2. No SQL Editor do Supabase, promova-se a ADM:
   `update public.profiles set role_global = 'admin' where email = 'seu@email';`
3. Em `/admin/ministerios` crie os ministérios, cargos e vincule as pessoas.

## Fases
1. ✅ Auth + cadastros base (ministérios, cargos, usuários, membros, líderes)
2. Eventos, escalas, conflitos, confirmação/recusa, dashboards
3. Lembretes (Edge Function + pg_cron), provider WhatsApp/e-mail, PWA
