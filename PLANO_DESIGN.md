# PLANO DE EXECUÇÃO — Redesign Kaha Elite (design → produto)
### Documento para o Claude Code. Colocar na raiz do repo como `PLANO_DESIGN.md`.

---

## ANTES DE COMEÇAR (João faz isso)

1. Criar a pasta `/design` na raiz do repo e colocar os 6 arquivos HTML:
   - `Design_Dashboard_KahaElite.html`
   - `Design_Agenda_KahaElite.html`
   - `Design_Alunos_KahaElite.html`
   - `Design_Professores_KahaElite.html`
   - `Design_Conversas_KahaElite.html`
   - `Design_Configuracoes_KahaElite.html`
2. Esses arquivos são a **FONTE DA VERDADE VISUAL**. O Claude Code deve abrir e ler
   o arquivo correspondente antes de construir cada tela — não recriar de memória.

---

## REGRA DE OURO DESTE TRABALHO

**A lógica de negócio NÃO muda.** Os blocos B0–B4 estão prontos e testados:
`professores.ts`, `grade.ts`, `alunos.ts`, `fichas.ts`, `biblioteca.ts`, `sessoes.ts`,
`cargas.ts`, as migrations 0001–0010, as garantias no banco (índice anti dupla-marcação,
upsert idempotente de carga, RPC do questionário). **Não reescrever, não refatorar.**

Este trabalho é: (a) trocar a camada de apresentação, (b) reorganizar as rotas de 8 abas
para 6, (c) adicionar a configuração (tabelas novas) que a tela de Configurações exige.

---

## MUDANÇAS QUE VALEM PARA TUDO

### Design system: de dark-only para claro
O produto passa a ser **fundo claro com sidebar preta e vermelho de marca**.
Atualizar `CLAUDE.md` e os tokens do Tailwind:

```
--bg:#F4F4F5        fundo da página
--card:#FFFFFF      superfície dos cards
--ink:#0A0A0C       texto principal / sidebar / botões escuros
--ink-2:#3F3F46     texto secundário
--muted:#71717A     texto apagado
--muted-2:#A1A1AA   texto muito apagado / placeholders
--line:#E7E7EA      bordas
--line-2:#F1F1F3    divisores internos
--red:#E11D2E       MARCA: CTAs, nav ativa, destaque   (hover #FF3D4D)
--red-soft:#FEF2F3  fundo suave de marca/risco
--ok:#15A34A / --ok-soft:#F0FDF4       sucesso, "em ritmo", realizada
--warn:#D97706 / --warn-soft:#FFFBEB   atenção, "oscilando", aguardando
--risk:#B91C1C      risco (texto/ícone)
--blue:#2563EB / --blue-soft:#EFF6FF   confirmada
--zap:#25D366       verde do WhatsApp (só no botão de enviar)
```
Tipografia: **Archivo 800/900 itálico** em títulos (com `text-transform:uppercase` nos
títulos de página), **Inter** no corpo. Raio padrão: 16px nos cards, 20px na sidebar.

**Disciplina do vermelho:** vermelho = marca e ação. Atenção = âmbar. Risco = vermelho
escuro (`--risk`). Nunca usar `--red` puro para "perigo" — senão a tela vira alarme.

### A RÉGUA DOS CARDS (o mais importante do redesign)
Todo card, em toda tela, segue a mesma estrutura:
- `padding: 18px`, `display:flex; flex-direction:column`
- **Cabeçalho de altura fixa (20px)**: título à esquerda (13px, weight 700) + ação à
  direita (11.5px, muted — link "Ver tudo →", "•••", ou um dado tipo "22 alunos").
  **Todo card tem cabeçalho. Todo cabeçalho tem os dois lados.**
- Números grandes: **34px**, Archivo itálico 800, em todos os cards sem exceção
- Rodapés/CTAs colam na base (`margin-top:auto`)
- Cards da mesma linha têm altura igual (`align-items:stretch` no grid)

### Navegação: de 8 abas para 6
`Dashboard · Agenda · Alunos · Professores · Conversas · Configurações`
- `/sessoes` → passa a ser **`/agenda`** (redirect 308 da rota antiga)
- **Treinos** deixa de ser aba — a ficha vive dentro do aluno
- **Comercial** sai — o que importava dele virou "precisa de atenção" no Dashboard
- Desktop: sidebar preta fixa (236px, cantos 20px). Mobile: bottom nav com 5 itens
  (Dashboard, Agenda, Alunos, Conversas, Mais→sheet com Professores/Configurações)

### REGRA NOVA E PERMANENTE: nada financeiro na interface
**Proibido exibir** R$, valores, mensalidade, receita, ticket, "R$ parados", em
qualquer tela. O campo `valor_mensal` pode existir no banco, mas **não aparece na UI**.
Onde havia dinheiro, usar tempo e presença ("a semana fecha em 4 dias", "2 semanas sem
treinar"). Adicionar essa regra ao `CLAUDE.md` junto do vocabulário proibido.

### Vocabulário (continua inegociável)
Proibido em qualquer texto visível: IA, inteligência artificial, chatbot, robô,
automático, automação, CRM, disparo, bot. Julia é **a concierge do Elite**.
Âncora: **presença**.

---

# BLOCOS DE EXECUÇÃO (na ordem, um aceite por vez)

## D0 · Fundação: design system + shell + rotas
1. Atualizar `CLAUDE.md`: paleta clara, régua dos cards, 6 abas, regra "nada financeiro".
2. Trocar os tokens no `tailwind.config.ts` pela paleta acima.
3. Shell responsivo novo: sidebar preta (logo K vermelho, MENU/GERAL, item ativo em
   vermelho, badges, rodapé com o usuário) + bottom nav no mobile.
4. Componentes-base em `/components/ui` — usar em TODAS as telas, nunca estilizar solto:
   `Card` + `CardHeader` (a régua), `StatCard`, `ListRow`, `Chip` (ok/warn/risk/conf),
   `Avatar`, `EmptyState`, `Skeleton`, `Toast`, `Toggle`, `FilterChip`.
5. Rotas: `/dashboard /agenda /alunos /professores /conversas /configuracoes`.
   Redirect de `/sessoes` para `/agenda`.
6. **Migration de configuração (movida do D5 — CORREÇÃO 1).** As tabelas `kaha_config`,
   `kaha_templates`, `kaha_movimentos`, `kaha_faq` entram AQUI, no D0, porque o D6
   (fila da Julia) depende de `kaha_templates` e `kaha_movimentos` — deixá-las no D5
   quebrava a ordem dos blocos. **Número: usar a PRÓXIMA migration livre em
   `supabase/migrations/`, nunca hardcodar (CORREÇÃO 2).** Ver a DDL de referência no D5.
   > Estado real: `kaha_templates` + os 6 textos já vieram na `0011`. As outras três
   > (`kaha_config`, `kaha_movimentos`, `kaha_faq`) foram criadas na **`0013`**.
**Aceite:** navegar as 6 abas em desktop (sidebar) e mobile (bottom nav), no visual
claro correto, sem quebra. Telas podem estar vazias.

## D1 · Alunos (ler `/design/Design_Alunos_KahaElite.html`)
Tabela densa no desktop com 6 colunas: Aluno (avatar + nome + objetivo, com ⚠️ e a
queixa no subtítulo quando houver `dor_queixa` recente) · Uso 4 semanas (4 quadradinhos
+ chip) · Último treino (vermelho quando > 10 dias) · Esta semana (sessão com o pontinho
da cor do professor, ou "Sem sessão" vermelho) · Treino (divisão + nº de exercícios, ou
"Sem ficha" âmbar) · Ações.
- **Ordenação padrão: uso ascendente** (mais frio primeiro).
- Filtros como chips com contagem: Todos · Em risco · Oscilando · Em ritmo · Sem ficha ·
  Sem sessão esta semana.
- **A ação principal muda pelo estado**: sem ficha → "Montar"; sem sessão → "Marcar";
  em dia → ícones neutros.
- Mobile: cards com a mesma informação empilhada.
- Consumir `kaha_alunos_semaforo` (já existe). Não recalcular.
**Aceite:** lista real do banco, filtros e contagens corretos, ordenação por uso,
desktop + mobile.

## D2 · Professores (ler `/design/Design_Professores_KahaElite.html`)
Duas colunas: lista do time à esquerda (cor por professor, contagem de aulas) +
detalhe à direita.
- Detalhe: header (avatar grande, nome, especialidade, WhatsApp, chip Ativo, Editar) +
  4 stats (Aulas esta semana · Horários na grade · **Ainda livres** em vermelho ·
  Nota dos alunos dele) + **grade de horários** + aulas da semana.
- **Grade**: dia × hora (06:00–21:00), três estados — *atende* (contorno da cor do
  professor), *com aula marcada* (preenchido + ✓), *não atende* (cinza).
  **Horário com sessão marcada fica TRAVADO** — não permitir desmarcar disponibilidade
  embaixo de um aluno já agendado. Validar no servidor.
- Botão "Copiar semana anterior".
- **Os números do topo têm que ser derivados da grade real** (grade = livres + com aula).
  Não hardcodar.
- Cor do professor: derivar de forma estável do id (paleta fixa: #E11D2E, #2563EB,
  #15A34A, #7C3AED) — a MESMA cor tem que aparecer na Agenda e nos Alunos.
**Aceite:** criar/editar professor, montar grade, ver os números baterem com a grade,
tentar desmarcar horário ocupado → bloqueado.

## D3 · Agenda (ler `/design/Design_Agenda_KahaElite.html`)
Padrão Google Calendar. Semana em colunas (Seg→Dom), coluna de horas 06:00–21:00,
navegação ‹ Hoje ›, alternador Dia/Semana/Mês, hoje destacado, **linha vermelha do agora**.
- **Cada professor é um "calendário" com sua cor.** Checkboxes coloridos na lateral
  filtram por professor (padrão "Meus calendários" do GCal).
- Estado da sessão pelo estilo do bloco: confirmada = sólido; aguarda = tracejado;
  realizada = ✓ + opacidade reduzida; faltou = hachurado com nome riscado.
- **Horários livres da grade aparecem como caixa tracejada "+ livre"** e são clicáveis
  → marcar sessão. Com um **toggle "Horários livres"** na barra superior para ligar/
  desligar (senão a tela vira um mar de tracejado).
- **Popover ao clicar** (padrão GCal): barra da cor do professor, nome do aluno,
  dia/hora, "com {professor}", treino do dia + nº de exercícios, "último treino há X
  dias", chip de estado. **O botão principal muda pelo estado**:
  - confirmada → **"Dar o treino"** (vermelho) → vai para a execução
  - aguarda → "Pedir confirmação" (vai para Conversas com a sugestão pronta)
  - realizada → "Ver o treino"
  - livre → "Marcar sessão"
- Lateral: mini calendário do mês, filtro de professores, "Sem sessão esta semana" com
  botão Marcar.
- **Mobile = vista do dia** (lista corrida com hora grande, aluno, treino, chip), não a
  semana espremida.
- Reusar `horariosLivres`, `marcarSessao`, `mudarEstado` — já existem e estão testados.
**Aceite:** semana real do banco, filtro por professor, slot livre → marcar → aparece,
popover com a ação certa por estado, mobile em vista de dia.

## D4 · Execução do treino + questionário do professor
⚠️ **Não há arquivo de design para esta tela.** Construir usando o design system do D0
e a estrutura abaixo. É a tela mais usada do produto (professor em pé, celular na mão).
- Header: aluno, progresso "3/6 exercícios", botão Concluir.
- Um card por exercício: nome + meta da ficha ("4×10 · alvo 40kg") + **última
  performance** ("última vez: 3×10 · 38kg") — usar `ultimaCargaPorExercicio` (existe).
- Séries: inputs grandes de reps/carga, `inputMode="decimal"`, **font-size 16px**
  (anti-zoom iOS), **salvar contínuo** (debounce + blur) com ✓ por série — nunca um
  formulário que só salva no fim.
- Badge **PR ↑** quando a carga de hoje supera a última daquele exercício.
- Card colapsa ao completar (mantém a tela curta).
- **"Concluir sessão" abre o questionário do professor** (bottom sheet, 4 toques):
  empenho (1–5) · evolução (evoluiu/manteve/regrediu) · dor ou queixa (texto opcional) ·
  **"vê risco de cancelamento?" (não/talvez/sim)**. Salvar → `kaha_feedbacks`
  origem='professor' → sessão vira 'realizada'.
**Aceite:** registrar cargas no celular, fechar a tela no meio, reabrir → tudo lá;
concluir → questionário → feedback gravado → sessão realizada → conta no semáforo.

## D5 · Configurações + tabelas de configuração (ler `/design/Design_Configuracoes_KahaElite.html`)

> **CORREÇÃO 1+2:** a **migration** de configuração foi movida daqui para o **D0**
> (o D6 depende dela). Ela **NÃO** se chama `0011_kaha_config.sql` — `0011`/`0012` já
> existem; foi criada como a próxima livre (`0013_kaha_config.sql`). A DDL abaixo fica
> como **referência do schema** para a TELA do D5; a criação das tabelas já aconteceu.

### Migration (referência — aplicada no D0 como `0013_kaha_config.sql`)
```sql
-- singleton de configuração
create table if not exists kaha_config (
  id boolean primary key default true check (id),
  julia_nome text default 'Julia',
  julia_apresentacao text default 'Julia, do time Kaha Elite',
  saudacao text,
  tom text default 'proximo' check (tom in ('proximo','energia','premium')),
  emoji text default 'moderado' check (emoji in ('avontade','moderado','quase_nenhum')),
  nunca_fazer text,
  numero_elite text,
  janela_inicio time default '08:00',
  janela_fim time default '20:00',
  janela_domingo boolean default false,
  duracao_min int default 60 check (duracao_min in (30,45,60)),
  sessoes_semana int default 1,
  antecedencia_marcar text,
  prazo_cancelar text,
  sessao_extra text default 'se_houver_vaga'
    check (sessao_extra in ('nao','se_houver_vaga','cobrando')),
  dois_alunos_mesmo_horario boolean default false,
  plano_nome text default 'Kaha Elite',
  funcionamento text,
  orgulho text,
  escalar_dor boolean default true,
  escalar_reclamacao boolean default true,
  escalar_cancelamento boolean default true,
  escalar_valores boolean default true,
  resposta_valores text,
  escalar_contato text,
  updated_at timestamptz default now()
);
insert into kaha_config (id) values (true) on conflict do nothing;

-- padrão de mensagem por tipo
create table if not exists kaha_templates (
  tipo text primary key check (tipo in
    ('confirmacao','pre_treino','pos_treino','presenca','renovacao','resgate','agendamento')),
  conteudo text not null,
  updated_at timestamptz default now()
);

-- movimentos ligados/desligados
create table if not exists kaha_movimentos (
  chave text primary key,
  ativo boolean default true
);
insert into kaha_movimentos (chave, ativo) values
  ('escolha_professor',true),('agendamento',true),('confirmacao',true),
  ('pre_treino',true),('pos_treino_aluno',true),('pos_treino_professor',true),
  ('presenca',true),('resgate',false),('renovacao',false)
on conflict do nothing;

-- perguntas frequentes
create table if not exists kaha_faq (
  id uuid primary key default gen_random_uuid(),
  pergunta text not null,
  resposta text not null,
  ordem int default 0
);

alter table kaha_config enable row level security;
alter table kaha_templates enable row level security;
alter table kaha_movimentos enable row level security;
alter table kaha_faq enable row level security;
-- authenticated-only, sem USING(true) para anon (seguir a convenção do repo)
```
Semear `kaha_templates` com os textos que estão no arquivo de design (Pré-treino,
Confirmação, Pós-treino, Resgate, Presença, Renovação).

### Tela
Subnav à esquerda (A Julia · Padrão de mensagem · Movimentos · Regras da sessão ·
A academia · Acesso) + conteúdo em cards empilhados.
- **A Julia**: nome, apresentação, saudação da casa, tom (chips), emoji (chips), nunca
  fazer, número do Elite (com chip **"Aguardando conexão"** enquanto não houver API),
  janela de envio.
- **Padrão de mensagem** ⭐: um acordeão por tipo. Aberto mostra: `textarea` com o
  template + **chips de variável clicáveis** ({nome} {treino_do_dia} {ultima_carga}
  {professor} {hora} {link_q} {horarios_livres} {dias_para_vencer}) que inserem no
  cursor + **preview ao vivo renderizado com dados reais de um aluno** ("Como fica com
  a Camila, hoje") em bolha de WhatsApp, com as variáveis substituídas destacadas.
  Fechado mostra a primeira linha do template.
- **Movimentos**: os 9 toggles com título + descrição (copiar os textos do arquivo de
  design — foram escritos com cuidado). Contador no cabeçalho ("7 de 9 ligados").
- **Regras da sessão**: duração (chips 30/45/60), sessões por semana, antecedência,
  prazo de cancelamento, sessão extra, dois alunos no mesmo horário.
- **A academia**: nome do plano, funcionamento, orgulho da casa, **FAQ** (lista
  editável + adicionar), **limites** (toggles do que sempre escala) + resposta sobre
  valores + contato de escalonamento.
- Salvar/Descartar no topo da página.
**Aceite:** editar um template → preview muda na hora → salvar → recarregar → persiste;
desligar um movimento → some da fila de Conversas.

## D6 · Conversas (ler `/design/Design_Conversas_KahaElite.html`)
Três painéis: lista → conversa → contexto do aluno.
- **Esquerda**: segmentado "Fila de hoje (n)" | "Todas". Itens com avatar, nome,
  snippet, chip do tipo (Pré-treino/Pós-treino/Resgate/Confirmação) e badge de não lidas.
- **Centro**: thread (bolhas: saída escura com o rótulo "Julia", entrada branca) +
  **card preto com a sugestão da Julia**: texto renderizado do template de
  `kaha_templates` com os dados reais do aluno, **editável inline**, botão verde
  **"Enviar no WhatsApp"** (`wa.me/55{telefone}?text={urlencoded}`), Editar, Descartar.
  Ao enviar → grava em `kaha_mensagens` (status 'enviada') → sai da fila.
- **Direita — contexto do aluno** (o diferencial): uso 4 semanas, sessão desta semana,
  última sessão + última carga + nota que ele deu, e o card âmbar **Preferências**
  (campo `preferencias` do aluno). Botão "Ver perfil completo".
- **Motor da fila** (`lib/julia/fila.ts`), derivado dos dados de hoje (America/Sao_Paulo),
  respeitando os movimentos ligados em `kaha_movimentos` e a janela de envio:
  - confirmacao: sessões de hoje 'agendada'
  - pre_treino: sessões de hoje 'confirmada' (com treino do dia + última carga)
  - pos_treino: sessões 'realizada' hoje sem feedback do aluno (inclui o link `/q/{token}`)
  - resgate: alunos sem sessão na semana (com horários livres reais para oferecer)
  - renovacao: vencimento ≤ 7 dias
  - presenca: sem sessão na semana e sem mensagem há 3+ dias
  - **Dedupe: um item por aluno por dia**, prioridade confirmação/pré-treino >
    pós-treino > resgate > renovação > presença.

### "Falar com vários" ⚠️ (a feature mais delicada do produto)
Modal com filtros (Sem aparecer há 7+ dias · Sem sessão esta semana · Renova em 7 dias ·
Todos), lista com checkbox e, **embaixo de cada nome, o preview da mensagem individual
daquele aluno** (nome + tempo parado + última carga + horário livre do professor dele).

**Regras inegociáveis desta feature:**
1. **NUNCA enviar o mesmo texto para mais de um aluno.** Cada mensagem é renderizada
   individualmente com os dados daquele aluno. Se duas mensagens saírem idênticas, é bug.
2. **Envio um a um**, nunca em massa: o botão é "Revisar e enviar um a um" e abre uma
   conversa de cada vez (wa.me), com o humano confirmando cada envio.
3. **Intervalo mínimo entre envios** e **teto diário** configurável (proteção anti-bloqueio
   — o número anterior da operação já foi bloqueado por padrão de disparo).
4. O aviso verde explicando que cada aluno recebe uma mensagem própria **fica visível**.
**Aceite:** fila gera os tipos certos; editar a sugestão muda o texto que vai pro wa.me;
enviar → sai da fila e entra no histórico; "Falar com vários" com 6 selecionados gera 6
textos diferentes; um aluno nunca aparece em dois tipos no mesmo dia.

## D7 · Perfil do aluno + polish final
⚠️ **Sem arquivo de design.** Usar o design system. Abas: Visão geral (plano, semana
atual, últimas atividades, **card Preferências editável**) · Treino (ficha + editar) ·
Progresso (por exercício: última carga vs anterior ↑↓ + sparkline; satisfação média) ·
Sessões (histórico com estado, professor, nota do aluno, empenho do professor).
Polish: empty states em toda tela, skeletons, toasts, varredura de vocabulário proibido
E de conteúdo financeiro, revisão nos dois viewports.

---

## HIGIENE (pendências abertas desde o build — resolver até o D7)
- [ ] Trocar a senha do usuário piloto (está em texto puro no histórico)
- [ ] Remover o professor de teste "Marina Alves (teste RLS)" e a sessão demo do `/q/`
- [ ] CHANGELOG das migrations 0001→0011 (o que cada uma fez)

## FORA DE ESCOPO (não deixar o Claude Code inventar)
Nutrição, hábitos, chat in-app, fotos de progresso, wearables, vídeos de exercício,
pagamento/cobrança, qualquer coisa financeira na UI, envio automático de WhatsApp
(Fase 2 — Meta Cloud API), login individual por professor, multi-academia.

---

## COMO EXECUTAR (João)
No Claude Code, um bloco por vez:
> "Leia `PLANO_DESIGN.md` e `CLAUDE.md`. Execute o **D0**. Pare no aceite."

Nunca deixar avançar sem o aceite validado **nos dois viewports**. Se o tempo apertar,
a ordem de valor para a demonstração é: **D0 → D3 (Agenda) → D6 (Conversas) → D1 →
D2 → D4 → D5 → D7**.
