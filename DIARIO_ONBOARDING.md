# Diário — Wizard de Onboarding (branch `onboarding`)

Registro de decisões e, principalmente, de onde o escopo **conflita com a regra
máxima** ("NÃO toque em nada já commitado: D0–D3, D6, D8, migrations 0001–0015,
seed"). Onde há conflito, eu **não improviso**: entrego a peça pronta de forma
aditiva e deixo aqui o gancho exato que falta, para você decidir.

## Conflitos com a regra máxima (2)

### C1 — Auto-abrir /setup no primeiro login (escopo item 2)
"Rota /setup, aberta automaticamente no primeiro login enquanto não concluída."
- O gancho natural é o **middleware** (`lib/supabase/middleware.ts`) ou o **login**
  (`app/login/page.tsx`) — ambos **já commitados**. Redirecionar exige editá-los.
- **Decisão:** NÃO editei nenhum arquivo commitado. Construí `/setup` como rota
  standalone, funcional e navegável, que **se auto-protege** (se `onboarding_concluido`
  = true, redireciona para /agenda). Falta só o *empurrão* no login.
- **Gancho que falta (você aplica em 30s, ou me autoriza):** em
  `lib/supabase/middleware.ts`, logo após obter `user`, quando o usuário está
  logado e o onboarding não está concluído, redirecionar para `/setup`. Query:
  `select onboarding_concluido from kaha_config`. Deixei a checagem pronta em
  `lib/kaha/onboarding.ts` (`onboardingConcluido()`), então é 1 `if`.
- **Impacto de não aplicar:** no ambiente atual (demo) o wizard está CONCLUÍDO,
  então nada muda. Só importa depois do `limpar-seed.sql`, quando o gestor real
  entra — aí ele acessa `/setup` manualmente (ou você aplica o gancho).

### C2 — Card "Configuração X de 4" no Dashboard (escopo item 4)
"Pendências viram card no Dashboard 'Configuração X de 4'."
- O Dashboard é **D8, commitado**. Adicionar um card exige editar
  `app/(app)/dashboard/dashboard-d8.tsx`.
- **Decisão:** NÃO editei o D8. Construí o card como **componente standalone**
  pronto (`components/onboarding/pending-card.tsx`) + o cálculo de "X de 4"
  (`lib/kaha/onboarding.ts`).
- **Gancho que falta:** 1 linha no `dashboard-d8.tsx` renderizando
  `<OnboardingPendingCard />` no topo do grid (só aparece se houver pendência).
  Deixei o snippet exato no RELATORIO_NOTURNO.md.
- **Impacto de não aplicar:** nenhum no demo (onboarding concluído → card não
  apareceria mesmo). Relevante só no fluxo do gestor real.

## Decisões próprias (dentro do escopo)
- **Capacidade via plano sem tocar o D8:** mantive `kaha_alunos.meta_semanal`
  como espelho denormalizado do `plano.meta_semanal` (setado no vínculo e no
  import). Assim o D8 (que soma `meta_semanal`) já reflete "capacidade via plano"
  sem eu editar D8. Verificado: capacidade via meta == via plano == 30.
- **Relaxei o check** `meta_semanal in (3,5)` para `> 0` (migration 0016), senão
  planos com metas arbitrárias (ex.: 4) quebrariam o import. Nenhum valor mudou.
- **/setup fora do route group `(app)`** (sem a sidebar/shell): wizard é
  tela cheia, mobile-first. Arquivos novos, não toco no layout commitado.

## Bloqueios que forçam PARADA
(nenhum até agora — os conflitos acima foram contornados de forma aditiva)
