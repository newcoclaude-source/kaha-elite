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

## Design
Dark-only. Fundo #0A0A0C · superfícies #121215/#1A1A1F · bordas #26262D ·
texto #F5F5F6 · muted #96969E/#5D5D66 · marca #E11D2E (hover #FF3D4D) ·
ok #2FD07A · atenção #F5A623 · risco #FF5A68 · confirmado #4DA6FF.
Títulos Archivo 800/900 itálico uppercase; corpo Inter. Desktop = sidebar;
mobile = bottom nav. Toda tela nos DOIS viewports.

## Vocabulário (INEGOCIÁVEL em qualquer texto visível)
PROIBIDO: IA, inteligência artificial, chatbot, robô, automático, automação,
CRM, disparo, bot. Julia é "a concierge do Elite". Âncora do produto: PRESENÇA.
Julia nunca finge ser humana ou um professor específico.

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
