# Relatório Noturno — Wizard de Onboarding (branch `onboarding`)

> A sessão caiu ("Connection closed") logo antes do teste de banco do import.
> Este relatório reflete o estado real ao acordar. Regra máxima respeitada:
> nenhum arquivo commitado (D0–D3, D6, D8, migrations 0001–0015, seed) foi tocado.

## 1. O que está PRONTO e COMMITADO

**Step 1 — `8f1a20c`** (migration 0016 + scripts). Testado via SQL.
- `kaha_planos` (nome, meta_semanal) + `plano_id` em `kaha_alunos` (on delete set null).
- Migração dos existentes: criou **Convencional (3)** e **Elite (5)** e vinculou cada
  aluno ao plano da meta que ele JÁ tinha. Nenhuma meta alterada; **capacidade 30 = 30**
  (via meta e via plano). `onboarding_concluido = true` no ambiente atual.
- Relaxou o check `meta_semanal in (3,5)` → `> 0` (planos com metas arbitrárias).
- `limpar-seed.sql` agora remove planos seed + reseta `onboarding_concluido=false`.
- `seed-demo.sql` cria/vincula planos + marca concluído.

**Step 2 — `734d39c`** (wizard `/setup`). Build verde + guarda de rota testada (307→login).
- Rota `/setup` FORA do route group `(app)` (tela cheia, mobile-first, design D0).
  Auth própria; redireciona a `/agenda` se concluído; `?preview=1` para visualizar.
- Migration 0017: `academia_nome`/`academia_horarios` em `kaha_config`.
- `lib/kaha/onboarding.ts`: `carregarSetup`, `onboardingConcluido`, `contarPendencias`.
- Passos 1–3 funcionais (Academia, Planos, Professores) com criar/remover, puláveis,
  barra "Passo X de 4". Actions criam com `seed=false`.
- `components/onboarding/pending-card.tsx`: card "Configuração X de 4" standalone.

## 2. O que está PRONTO mas NÃO COMMITADO (step 4 — import)

Tudo no disco, build passou (12/12; `/setup` 115 kB por causa do SheetJS, só nessa rota):
- `lib/kaha/import-parse.ts` — parse/validação PURO (sem React/DB/SheetJS).
- `app/setup/import-alunos.tsx` — upload `.xlsx/.csv` (SheetJS), mapeamento de colunas
  (auto-palpite), preview com contagem por plano, validação, "Importar N".
- `app/setup/actions.ts::importarAlunos` — insere em lote com `seed=false`, `meta_semanal`
  = meta do plano (espelho p/ a capacidade do D8).
- `package.json`/`lock` — dependência `xlsx@0.18.5`.
- `scripts/exemplo-import-alunos.xlsx` — planilha-exemplo de 10 linhas (reutilizável).
- `scripts/testar-import.mjs` — teste do parser.

**Teste do parser (Node) — PASSOU:**
`node scripts/testar-import.mjs` → total 10 · válidas 8 · problemas 2 (linha sem nome,
duplicado) · avisos 1 (telefone inválido) · porPlano Convencional=4, Elite=3, Sem plano=1.

## 3. O que FALTOU

- **Commit do step 4** (só aguardando sua aprovação do estado — 1 comando).
- **Teste do INSERT real do `importarAlunos` contra o banco** — era o próximo passo
  quando a sessão caiu. O caminho de dados (FK do plano, espelho de meta, seed=false)
  ainda não foi exercitado ponta a ponta no banco. É o principal gap.
- **Reconferir os números do banco** (MCP caiu; ver seção 5).

## 4. Decisões próprias (dentro do escopo) e conflitos com a regra máxima

Decisões (detalhe em `DIARIO_ONBOARDING.md`):
- **Capacidade via plano sem tocar o D8:** `kaha_alunos.meta_semanal` vira espelho
  denormalizado de `plano.meta_semanal` (setado no vínculo e no import). O D8 soma
  `meta_semanal` → já reflete a capacidade via plano. Verificado: 30 = 30.
- **Relaxei o check** de meta (3,5)→>0. Nenhum valor mudou.
- **/setup fora do shell** (arquivos novos, não toco em layout commitado).

Conflitos com a regra máxima — contornados de forma aditiva, **1 gancho cada**:
- **C1 · Auto-abrir /setup no primeiro login:** exige editar `middleware.ts`/`login`
  (commitados). NÃO editei. `/setup` é navegável e se auto-protege. Falta 1 `if` no
  middleware. Impacto no demo: nenhum (está concluído).
- **C2 · Card no Dashboard:** exige editar `dashboard-d8.tsx` (commitado). NÃO editei.
  Card pronto em `components/onboarding/pending-card.tsx`. Falta 1 linha no D8:
  `<OnboardingPendingCard />` no topo do grid (some sozinho quando concluído).

## 5. Como validar em 5 minutos

1. **git** (30s): `git -C "<repo>" log --oneline -3` → steps 1 e 2. `git status` →
   os 6 arquivos do step 4 uncommitted.
2. **Parser do import** (30s): `node scripts/testar-import.mjs` → deve terminar em
   `✅ ASSERÇÕES OK`. Abra `scripts/exemplo-import-alunos.xlsx` se quiser ver a planilha.
3. **Banco** (1 min — precisa do MCP de volta ou do painel Supabase): confira
   `kaha_config.onboarding_concluido = true`; alunos ativos = 8 (todos `seed=true`,
   todos com `plano_id`); professores ativos = 3; `sum(meta_semanal)` = 30; planos =
   Convencional(3)/Elite(5).
4. **Wizard na tela** (2 min): logado, acesse `/setup?preview=1` (o demo está concluído,
   então sem `preview` ele te manda pra /agenda). Ande pelos passos 1→4; no passo 4,
   suba `scripts/exemplo-import-alunos.xlsx` e veja o preview (8 válidas, contagem por
   plano). **Não clique "Importar"** se quiser manter o demo limpo — ou importe e depois
   apague os `seed=false` de teste.

## 6. Estado do banco — a confirmar (MCP caiu)

O teste temporário (setar `onboarding_concluido=false` + inserir alunos de teste)
**não executou** — a sessão caiu antes. Logo, o banco deve estar no estado DEMO
esperado (schema do onboarding aplicado, dados seed intactos). **Assim que o MCP
reconectar eu confirmo** os números da seção 5.3. Se por algum motivo estiver
alterado, restauro com `scripts/seed-demo.sql` (que recria os 8 alunos, 3 profs,
planos e marca concluído).

## Próximos passos (aguardando sua aprovação — NÃO continuei o build)
1. Confirmar os números do banco (MCP).
2. Testar o INSERT do `importarAlunos` num estado temporário e restaurar.
3. Commitar o step 4.
4. (Se você autorizar tocar committed) aplicar os ganchos C1 e C2.
