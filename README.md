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
│     ├─ agenda/                 agenda da igreja: TODOS veem TUDO, com filtros (ministério/período/busca)
│     ├─ minha-agenda/           "Minhas escalas" do voluntário (Fase 2)
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
├─ migrations/                   schema, RLS, triggers, RPCs (aplicadas no projeto gwtohygukijsdvksgsik)
└─ functions/send-reminders/     Edge Function de lembretes (Fase 3)
```

## Agenda x Escala
- **Agenda** (`/agenda`): todo usuário logado vê todos os eventos. Evento é da igreja (`ministry_id` nulo, só ADM cria) ou de um ministério (ADM ou líder dele cria).
- **Escala** é opcional por ministério (`ministries.scales_enabled`, switch em `/admin/ministerios/[id]`). Desligada: some a aba Escalas/Pendências do líder e o RLS barra novas escalas; o ministério segue usando a agenda.
- Migration: `supabase/migrations/20261117001844_agenda_aberta_e_escala_opcional.sql`.

## Cultos fixos
Tabela `event_templates` (dia da semana + horário). A função `materialize_fixed_events()` cria os eventos reais das próximas 8 semanas e roda todo dia 03:00 (pg_cron). Datas já geradas ficam em `event_template_runs`, então um culto apagado de propósito não volta. Migration: `20261117215402_eventos_fixos.sql`.

## Escalas (Fase 2)
Fluxo: **líder/vice escala** (rascunho) → **publica** → **voluntário confirma ou recusa com motivo** (pode pedir troca).
- Líder: `/lider/[id]/escalas` (próximos eventos da igreja + do ministério; "+ Escalar" sugere o cargo padrão; aviso de conflito com outro ministério via `check_schedule_conflicts`, não bloqueia) e `/lider/[id]/pendencias` (não vão → aguardando → rascunhos).
- Voluntário: `/minha-agenda` ("Minhas escalas": confirmar/"Não posso", vê com quem vai servir; `?ver=anteriores`).
- Início: minhas próximas escalas + pendências por ministério (ADM vê todos).
- Status: Rascunho (cinza) · Aguardando (amarelo) · Confirmado (verde) · Não vai (vermelho) — `components/schedules/status-badge.tsx`.
- Código: `lib/actions/schedules.ts`, `lib/schedules/pending.ts`, `components/schedules/*`.

## Projeto Supabase
Produção: **Naza2Tech** (`gwtohygukijsdvksgsik`), região **São Paulo (sa-east-1)**, migrado em 17/11/2026 do projeto antigo `gxbowilntkmeveejeecg` (us-east-2), que ficou pausado só como plano de volta. Mesmos IDs, usuários e senhas.

## Migrations e integração GitHub ↔ Supabase
O projeto Supabase está ligado ao GitHub (branch `main`). A integração compara os arquivos de `supabase/migrations` com o histórico do banco (`supabase_migrations.schema_migrations`) **pelo número da versão** e aplica o que faltar.
**Regra:** o prefixo do arquivo tem que ser exatamente a versão registrada no banco. Se a migration for aplicada pelo MCP/painel, confira a versão (`list_migrations`) e nomeie o arquivo igual **antes do push**. Versão diferente = a integração tenta rodar de novo na produção.
`seed.sql` só roda em branches de preview (produção já foi semeada).

## Exclusões e integridade
Nada é apagado se tiver dependência. Banco: FKs de negócio em **RESTRICT** (ministério, cargo, membro, evento, escala, cultos fixos, perfil). Continuam CASCADE só extensões do mesmo registro (profile_details, notification_log, event_template_runs).
Antes de excluir, o app chama `delete_blockers(entidade, id)` e mostra o que impede (ex.: "Escalas (1): 22/11 Culto Devocional (Obreiros)") — `src/lib/actions/blockers.ts`. Vale para usuário, ministério, cargo, evento e remoção de membro. Para manter histórico, **desativar** em vez de excluir. Migration `20261118001636_integridade_exclusoes.sql`.

**Inativar** (regra do cliente: quem tem vínculo não é excluído, é inativado):
- Usuário inativo não entra (login recusa; sessão aberta é encerrada via `/auth/inativo`) e perde todas as permissões no banco (`is_active_user()` nos helpers de RLS). Ao desativar, o ADM é avisado das escalas futuras da pessoa.
- Ministério inativo some do menu/início/liderança de quem participa e não aceita escala nova; histórico mantido.
- Migration `20261118002141_inativar_de_verdade.sql`.

## Senhas
Política única em `src/lib/password.ts`: mínimo 8, maiúscula, minúscula, número e caractere especial, sempre com **confirmação**. Vale no cadastro, em Conta → Trocar senha (destino do "esqueci a senha") e nas senhas provisórias do ADM (`generateStrongPassword`, 12 caracteres). O login não aplica a regra, para contas antigas continuarem entrando. Campo com checklist: `components/forms/password-fields.tsx`.

## Ficha do usuário e cadastro completo
- `/admin/usuarios` → clique no nome → `/admin/usuarios/[id]`: cadastro completo, **e-mail de login**, **redefinir senha** (senha provisória mostrada uma vez), ADM/ativo e ministérios.
- A própria pessoa completa o cadastro em **Conta** (mesmo formulário: `components/people/person-form.tsx`, regras em `lib/people/schema.ts`, actions em `lib/actions/people.ts`). Só o nome é obrigatório; CEP preenche o endereço pela ViaCEP.
- Privacidade: `profiles` (nome, apelido, e-mail, WhatsApp) é visível a líderes; `profile_details` (nascimento, endereço, estado civil, batismo, emergência) só à própria pessoa e ao ADM.
- Segurança: usuário comum não altera o próprio `active`, `email` nem `role_global` (trigger `guard_profile_role`). Migration `20261117223939_cadastro_completo.sql`.

## Líder e vice-líder
- **Líder** (`is_leader`): só o ADM define.
- **Líder** pode haver mais de um por ministério. Só líder titular (ou ADM) **coloca, remove e cadastra pessoas** na equipe.
- **Vice-líder** (`is_vice_leader`): o líder titular (ou o ADM) nomeia. O vice ajuda na operação (cargos, eventos, escalas), mas não coloca/remove/cadastra pessoas nem nomeia vice. Migration `20261117222602_equipe_so_lider.sql`.
- No banco: `is_leader_of()` = líder OU vice; `is_main_leader_of()` = só titular; trigger `guard_leader_flag` aplica as regras. Migration `20261117222203_vice_lider.sql`.

## Cadastrar usuários pelo painel
- **ADM** (`/admin/usuarios` → Novo usuário): qualquer ministério, pode marcar **Líder** por ministério e **Administrador geral**.
- **Líder** (`/lider/[id]/membros` → Novo voluntário): só no(s) ministério(s) que lidera; o titular pode marcar **Vice**. O vice não cadastra pessoas.
- E-mail que já tem conta: não cria outra, só vincula aos ministérios marcados.
- Conta nova: já confirmada, com senha provisória mostrada uma vez (mensagem pronta para WhatsApp); a pessoa troca em Conta.
- Código: `src/lib/actions/users.ts` (`createUser`, regras de permissão), `src/components/users/new-user-dialog.tsx`, `src/lib/supabase/admin.ts` (service role, só servidor; exige `SUPABASE_SERVICE_ROLE_KEY` na Vercel).
- Sem convite por e-mail: o SMTP padrão do Supabase não entrega para endereços externos de forma confiável.

## Identidade visual
Paleta e fontes vêm do site institucional (https://naza2-campinas.leo-ehrhardt82.workers.dev/): tema escuro, azul `#2f7bff` / `#5fb0ff`, títulos em **Unbounded**, texto em **Manrope**, botões em pílula. Os tokens estão em `src/app/globals.css` (prefixo `--naza-*`) e são mapeados para as variáveis do shadcn, então trocar a cor da marca é mexer em um lugar só. Para usar o logo oficial, coloque `public/logo.jpg` e ajuste `src/components/layout/brand.tsx`.

## Dados iniciais
`supabase/seed.sql` cadastra os 16 ministérios do site com cargos sugeridos. É idempotente; rode no SQL Editor quando precisar recriar.

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

## Login por telefone e importação de voluntários

- **Chave de acesso = telefone OU e-mail** (`src/lib/login-id.ts`). O Supabase Auth só entende e-mail, então
  quem não tem e-mail é criado com um e-mail *sintético* `DDNNNNNNNNN@telefone.naza2.invalid` (domínio
  reservado, nunca recebe mensagem; a tela esconde com `displayEmail()`). No login (`lib/auth/actions.ts`)
  o app acha o perfil pelo telefone e entra com o e-mail cadastrado — por isso, quando o ADM trocar o
  e-mail sintético por um real (`/admin/usuarios/[id]`), o telefone continua funcionando.
  Telefone repetido entre pessoas (família): o login por telefone pede para usar e-mail.
  "Esqueci a senha" só funciona para quem tem e-mail real; para os demais, o ADM redefine a senha.
- **Várias funções por pessoa**: `ministry_member_roles` (todas as funções) + `ministry_members.ministry_role_id`
  (cargo principal, sugerido ao escalar).
- **Aniversário sem ano**: gravado com ano 1904 e `profile_details.birth_year_unknown = true` (trigger).
- **/admin/importar** (ADM): CSV `nome;telefone;nascimento;funcoes[;emergencia_nome;emergencia_telefone]` (funções separadas por `|`, nomes iguais
  aos cargos do ministério). Cria contas novas (senha provisória baixada uma vez), só vincula quem já tem
  telefone cadastrado, não sobrescreve dados. Código: `lib/actions/import.ts`.
- `documentos/` (planilhas e CSVs com dados pessoais) fica fora do Git.
- **Visão geral (`ministries.sees_all`)**: membros de um ministério com essa marca (hoje só "Pastoral e Secretaria",
  sem escala) enxergam TODOS os ministérios — equipe, cargos e escalas publicadas — somente leitura
  (`is_member_of()` considera a marca; menu e filtro da agenda seguem `session.seesAll`). Editar continua sendo de
  líder/vice/ADM. Para dar a visão geral a mais pessoas, basta colocá-las nesse ministério; para outro ministério
  ter o mesmo efeito: `update ministries set sees_all = true where ...`.
- **Usuários**: busca (nome/telefone/e-mail, sem acento) + filtro de ministério ("Sem ministério" inclusive) e situação, via URL (`components/users/user-filters.tsx`).
- **Aniversários**: `upcoming_birthdays(dias)` (migration `aniversariantes`) devolve só nome + dia/mês a quem é membro ou ADM
  (`profile_details` continua privado); o Início mostra faixa "hoje" e os próximos 30 dias. Lembrete por WhatsApp = Fase 3.
- **Escalas de novembro/2026 da Mídia** foram importadas direto no banco a partir das imagens (Chat, Fotografia, Projeção):
  passadas (antes de 18/11) = publicadas e confirmadas; de hoje em diante = rascunho/pendente para o líder revisar e publicar.
