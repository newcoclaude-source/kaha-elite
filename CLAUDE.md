# Kaha Elite — Plataforma de Gestão & Relacionamento

## O que é
Plataforma B2B do CT Kaha (academia premium, Jundiaí). Plano "Kaha Elite":
22 alunos × R$1.000/mês, 1 sessão semanal com professor. Duas metades:
GESTÃO (professores, grades, alunos, fichas, sessões, cargas) e
RELACIONAMENTO (Julia, a concierge do Elite no WhatsApp).
Roadmap e specs: ler PLANO_MESTRE_V2.md (fonte da verdade).

## Fase atual: COPILOTO
Julia NÃO envia nada sozinha. A plataforma GERA a mensagem e abre o WhatsApp
via link wa.me — o humano envia. Integração real (Meta Cloud API) é Fase 2.

## Stack (não mudar sem discutir)
Next.js 14+ App Router + TS + Tailwind. Supabase (projeto NewCO, tabelas kaha_*,
compartilhado com um CRM SellCloser — NUNCA tocar em tabelas fora do prefixo kaha_).
Deploy Vercel. Sem libs de UI pesadas.

## Design (CLARO — redesign PLANO_DESIGN)
Fundo claro, sidebar preta, vermelho de marca. Tokens (tailwind.config):
bg #F4F4F5 · card/surface #FFFFFF · surface-2/line-2 #F1F1F3 · border/line #E7E7EA ·
text/ink #0A0A0C · ink-2 #3F3F46 · muted #71717A · muted-2 #A1A1AA ·
red/brand #E11D2E (hover #FF3D4D) · red-soft #FEF2F3 ·
ok #15A34A/ok-soft #F0FDF4 · warn #D97706/warn-soft #FFFBEB · risk #B91C1C ·
blue/confirmed #2563EB/blue-soft #EFF6FF · zap #25D366 (só botão WhatsApp).
Disciplina do vermelho: marca/ação = red; atenção = warn (âmbar); risco = risk
(vermelho ESCURO). Nunca red puro para "perigo".
Títulos Archivo 800/900 itálico (uppercase nos títulos de página); corpo Inter.
Raio 16px cards, 20px sidebar.

RÉGUA DOS CARDS (usar sempre, via components/ui/Card+CardHeader): padding 18px,
flex-col; cabeçalho de altura fixa com título (13px/700) à esquerda + ação/dado à
direita (todo card tem cabeçalho, com os dois lados); números grandes 34px Archivo
itálico 800; CTAs colam na base (margin-top:auto); cards da linha com altura igual.

Navegação = 6 abas: Dashboard · Agenda · Alunos · Professores · Conversas ·
Configurações. Desktop = sidebar preta (236px); mobile = bottom nav (Dashboard,
Agenda, Alunos, Conversas, Mais→sheet). /sessoes redireciona (308) para /agenda.
Toda tela nos DOIS viewports.

## Vocabulário (INEGOCIÁVEL em qualquer texto visível)
PROIBIDO: IA, inteligência artificial, chatbot, robô, automático, automação,
CRM, disparo, bot. Julia é "a concierge do Elite". Âncora do produto: PRESENÇA.
Julia nunca finge ser humana ou um professor específico.

## Nada financeiro na interface (PERMANENTE)
PROIBIDO exibir R$, valores, mensalidade, receita, ticket, "R$ parados" em
QUALQUER tela. `valor_mensal` pode existir no banco, mas não aparece na UI.
Onde havia dinheiro, usar tempo e presença ("a semana fecha em 4 dias",
"2 semanas sem treinar").

## Engenharia (lições que viraram lei)
- RLS authenticated-only (auth.uid() is not null). NUNCA USING(true) pra anon.
  Única exceção pública: RPC security definer do questionário (PLANO_MESTRE_V2).
- Nenhuma credencial no código. .env.local + .env.example.
- Garantias críticas também no BANCO (unique/índices), não só na aplicação.
- Escrita testada fim-a-fim NA UI. Migrations sequenciais documentadas no
  CHANGELOG. Commit pequeno por bloco. Nome desnormalizado onde referência
  externa pode sumir (padrão biblioteca_id + nome).

## Modelo de domínio
Aluno paga 1 sessão/semana; uso 4 semanas = preditor de churn (≥3 verde, 2 âmbar,
≤1 risco). Professor é POR SESSÃO, não fixo. Estados: pendente→agendada→
confirmada→realizada (ou faltou/cancelada). semana_ref = segunda-feira,
America/Sao_Paulo, dia/hora explícitos (nunca derivar de timestamptz).
Ficha + histórico de cargas alimentam as mensagens da Julia.
