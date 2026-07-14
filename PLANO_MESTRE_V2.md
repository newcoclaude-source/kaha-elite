# PLANO MESTRE v2 — Plataforma Kaha Elite
### Documento definitivo para execução via Claude Code. Colocar este arquivo na raiz do repo.
### Pré-requisito: B0–B4 concluídos (shell, schema, professores+grade, alunos+fichas+biblioteca, sessões+cargas). Este plano NÃO refaz nada disso — evolui em cima.

---

# A VISÃO (o que cada pessoa sente)

**O aluno** sente que a academia está presente todos os dias: confirmação da sessão,
mensagem antes do treino citando o que vai treinar, pergunta depois de como foi,
dicas nos dias sem treino. Nunca uma cobrança — sempre presença.

**O professor** abre o celular e sabe tudo: os horários dele hoje, quem é cada aluno,
como cada um gosta de treinar (preferências + histórico de cargas + o que disse no
último questionário), e registra o treino sem fricção. Ao concluir, responde 4 toques
sobre o aluno.

**O gerente** abre o painel e vê só o que importa: quem está em risco e POR QUÊ
(uso + satisfação + alerta do professor), o que a semana está rendendo, e o que
precisa de ação hoje.

## Os 3 loops (a mecânica do produto)
1. **Loop do aluno:** Julia manda → aluno responde questionário → vira dado.
2. **Loop do professor:** vê preferências/histórico → dá aula melhor → registra carga
   + questionário → alimenta o perfil do aluno.
3. **Loop do gerente:** os dados dos dois loops viram o score de risco e o painel.

## Regras permanentes (relembrar em todo bloco)
- Vocabulário proibido em QUALQUER texto visível: IA, chatbot, robô, automático,
  automação, CRM, disparo, bot. Julia = concierge do Elite. Âncora = presença.
- Fase COPILOTO: Julia gera, humano envia (wa.me). Nada de envio automático.
- RLS authenticated-only (exceto o endpoint público tokenizado do questionário,
  descrito abaixo, que usa RPC security definer — nunca abrir tabela pra anon).
- Sem credencial no código. Migrations sequenciais. Commit por bloco.
- Toda tela: desktop (≥1024px, sidebar) E mobile (<1024px, bottom nav).

---

# PARTE 1 — DELTA DE SCHEMA (migration 0008)

```sql
-- 1. Feedback estruturado (aluno e professor) — evoluir kaha_feedbacks
alter table kaha_feedbacks
  add column if not exists empenho int check (empenho between 1 and 5),
  add column if not exists risco_percebido text
    check (risco_percebido in ('nao','talvez','sim')),
  add column if not exists nota_treino int check (nota_treino between 1 and 5),
  add column if not exists comentario text;

-- 2. Token público do questionário do aluno (um por sessão)
alter table kaha_sessoes
  add column if not exists feedback_token uuid unique default gen_random_uuid();

-- 3. Preferências do aluno (editável + alimentado pelos questionários)
alter table kaha_alunos
  add column if not exists preferencias text;

-- 4. RPC pública para o aluno responder SEM login (única porta anon do sistema)
create or replace function kaha_responder_questionario(
  p_token uuid, p_nota int, p_gostou text, p_mudaria text
) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_sessao uuid; v_aluno uuid;
begin
  select id, aluno_id into v_sessao, v_aluno from kaha_sessoes
    where feedback_token = p_token and estado = 'realizada';
  if v_sessao is null then return false; end if;
  -- uma resposta por sessão
  if exists (select 1 from kaha_feedbacks where sessao_id = v_sessao and origem='aluno')
    then return false; end if;
  insert into kaha_feedbacks (sessao_id, origem, nota_treino, gostou_exercicios, comentario)
    values (v_sessao, 'aluno', p_nota, p_gostou, p_mudaria);
  return true;
end $$;
revoke all on function kaha_responder_questionario from public;
grant execute on function kaha_responder_questionario to anon, authenticated;
```

**Score de risco (view `kaha_alunos_risco` — criar na mesma migration):** combina,
por aluno: `uso_4sem` (da view existente), `satisfacao_media` (avg nota_treino dos
últimos 30d), `alerta_professor` (último risco_percebido). Regra explicável:
- **vermelho** se uso ≤ 1 OU alerta = 'sim' OU satisfação ≤ 2
- **âmbar** se uso = 2 OU alerta = 'talvez' OU satisfação = 3
- **verde** caso contrário
Retornar também os MOTIVOS (array text: 'X semanas sem treinar', 'professor sinalizou
risco', 'satisfação em queda') — o painel sempre mostra o porquê.

---

# PARTE 2 — BLOCOS DE EXECUÇÃO (ordem obrigatória)

## UI-1 · Shell responsivo + componentes-base
Sidebar desktop (colapsável, logo K, status "Julia · concierge" no rodapé) + bottom
nav mobile (Dashboard, Alunos, Sessões, Mais→sheet). Componentes: StatCard,
SectionCard, ListRow, Chip, EmptyState, Skeleton, Toast, TabBar. Nenhuma tela ainda.
**Aceite:** navegar tudo nos dois layouts sem quebra; componentes numa página /dev
de amostra (remover depois).

## UI-2 · Execução da sessão + questionário do professor ⭐
A tela do professor, padrão internacional (Hevy Coach):
- Header: aluno, progresso "3/6 exercícios", Concluir.
- Card por exercício: nome + meta da ficha + **última performance** ("última vez:
  3×10 · 38kg") — usar `ultimaCargaPorExercicio` que já existe.
- Séries: inputs grandes, salvar contínuo (já existe), ✓ por série; card colapsa ao
  completar; badge **PR ↑** quando carga > última.
- **"Concluir sessão" abre o questionário do professor (bottom sheet, 4 toques):**
  empenho (1-5 estrelas/números), evolução (chips: evoluiu/manteve/regrediu),
  dor ou queixa (texto opcional), "vê risco de cancelamento?" (não/talvez/sim).
  Salvar → kaha_feedbacks origem='professor' → sessão vira 'realizada'.
- Um "Pular questionário" discreto existe, mas o padrão é responder.
**Aceite:** fluxo completo no celular; feedback gravado; PR badge aparece quando
carga supera a última; sessão realizada conta no semáforo.

## UI-3 · Questionário público do aluno + página de resposta
Rota pública `/q/[token]` (fora do middleware de auth):
- Página mobile-first na identidade Kaha: "Como foi seu treino hoje, {nome}?"
- 3 campos: nota (1-5, toque), "o que você curtiu?" (chips + texto), "o que mudaria?"
  (texto opcional). Enviar → chama a RPC `kaha_responder_questionario` → tela de
  obrigado ("Nos vemos no próximo treino 💪").
- Token inválido/já respondido → mensagem gentil, sem vazar nada.
- NUNCA expor dados do aluno além do primeiro nome. Nada de login.
**Aceite:** abrir o link anônimo no celular, responder, ver o feedback em
kaha_feedbacks; segunda tentativa com o mesmo token é recusada.

## UI-4 · Julia copiloto — a fila do dia ⭐ (evolução do B6)
Página /conversas vira o centro de relacionamento. **Fila do dia** gerada dos dados:
- **Confirmações:** sessões de hoje em 'agendada' → mensagem de confirmação.
- **Pré-treino:** sessões de hoje 'confirmada' → mensagem citando o treino do dia da
  ficha + última carga ("semana passada foi 40kg no supino — bora passar disso").
- **Pós-treino:** sessões 'realizada' hoje sem feedback de aluno → mensagem + LINK
  do questionário (`/q/[token]`).
- **Presença:** alunos sem sessão marcada + sem mensagem há 3+ dias → dica/check-in.
- **Renovação:** vencimento ≤ 7 dias → toque de renovação.
Cada item da fila: aluno, tipo (chip), preview da mensagem (editável inline), botão
**WhatsApp** (wa.me/55{telefone}?text={mensagem urlencoded}) e "marcar enviada"
(grava em kaha_mensagens). Templates em `lib/julia/templates.ts` com placeholders
claros — a voz final da Kaha entra quando o formulário do gerente voltar.
**Aceite:** com dados de teste, a fila gera os 5 tipos corretamente; botão abre o
WhatsApp com o texto; enviada some da fila e fica no histórico do aluno.

## UI-5 · Perfil do aluno em abas (o dossiê que o professor consulta)
Header rico (avatar, status, semáforo, ações). Abas:
- **Visão geral:** plano, semana atual, últimas atividades, **card Preferências**
  (campo editável + últimas respostas de questionário: "curtiu treino de costas",
  "achou carga leve").
- **Treino:** ficha atual + editar (existente).
- **Progresso:** por exercício, última carga vs anterior (↑↓) + sparkline das
  últimas sessões (SVG simples). Satisfação média dos questionários.
- **Sessões:** histórico com estado, professor, nota do aluno e empenho dado pelo
  professor.
**Aceite:** as 4 abas com dados reais; preferências salvam; sparkline renderiza.

## UI-6 · Painel do gerente (dashboard final)
Padrão Hevy — 3 números + ação + feed:
- StatCards: Sessões da semana (usadas/total), **Alunos em risco** (da view
  kaha_alunos_risco, com R$ em jogo = risco × valor_mensal), Questionários da semana
  (respondidos/enviados).
- **Precisa de atenção:** lista vermelho/âmbar com os MOTIVOS explícitos e ação
  inline ("Marcar sessão" / "Gerar mensagem").
- Feed "Hoje": sessões confirmadas/realizadas, cargas registradas, questionários
  respondidos, PRs batidos.
- Gráfico: sessões realizadas por semana (8 semanas).
**Aceite:** números batem com o banco; motivos do risco aparecem; ações funcionam.

## UI-7 · Sessões (grade semanal) + polish final
Desktop: colunas Seg→Dom com cards; lateral "sem sessão". Mobile: mantém por dia,
cards mais ricos. Professores: cards com resumo da semana. Varredura final:
empty states em toda tela, skeletons, toasts, vocabulário proibido, teste completo
nos dois viewports.
**Aceite:** fluxo inteiro (cadastrar → ficha → marcar → executar → questionários →
painel) rodando liso em desktop e mobile.

---

# PARTE 3 — COMO EXECUTAR (instrução pro João)

1. Coloque este arquivo na raiz do repo como `PLANO_MESTRE_V2.md`.
2. No Claude Code: "Leia PLANO_MESTRE_V2.md e CLAUDE.md. Execute o bloco UI-1.
   Pare no aceite." — e assim por diante, um bloco por vez.
3. NUNCA deixe executar dois blocos sem validar o aceite do primeiro nos DOIS
   viewports (desktop + mobile).
4. A migration 0008 entra junto com o primeiro bloco que precisar dela (UI-2).
5. Depois do UI-7: trocar a senha do piloto, remover dados de teste, atualizar o
   CHANGELOG das migrations (0001→0008).

# PARTE 4 — FORA DE ESCOPO (não deixar o Claude Code inventar)
Nutrição, hábitos, chat in-app, fotos de progresso, wearables, vídeos de exercício,
envio automático de WhatsApp (Fase 2, Meta Cloud API), pagamento/cobrança, login por
professor (piloto usa acesso único; individual vem depois), multi-academia/tenant.
