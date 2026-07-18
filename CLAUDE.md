# Kaha Elite — Plataforma de Gestão & Relacionamento
### Manual de execução v2 · Leia este arquivo inteiro antes de qualquer tarefa

## O que é
Plataforma B2B do CT Kaha (academia premium, Jundiaí). Metas semanais por
plano (Convencional 3x, Elite 5x); capacidade = soma das metas dos alunos,
nunca multiplicador fixo. Duas metades: GESTÃO (professores, grades, alunos,
fichas, sessões, cargas) e RELACIONAMENTO (Julia, a concierge do Elite no
WhatsApp). Roadmap: Plano de Execução (fonte da verdade das frentes).

## Fase atual: COPILOTO
Julia NÃO envia nada sozinha. A plataforma GERA a mensagem e abre o WhatsApp
via wa.me — o humano revisa e envia. Meta Cloud API é Fase 2.

## Stack (não mudar sem discutir)
Next.js 14+ (App Router) + TypeScript + Tailwind. Supabase (projeto NewCO,
prefixo kaha_). Deploy: Vercel. Sem libs de UI pesadas.

# REGRAS PERMANENTES (inegociáveis)

## Produto e vocabulário
1. Julia é sempre "a concierge do Elite". PROIBIDO em texto visível: IA,
   inteligência artificial, bot, chatbot, robô, automação, automático,
   disparo, CRM, software.
2. Nada financeiro na UI. valor_mensal existe no banco e NUNCA aparece.
3. Âncora da marca: presença.
4. Mensagens flexionam gênero do aluno em TODOS os templates. Gênero errado
   é bug, mesmo fora do escopo declarado.

## Banco de dados
5. Supabase COMPARTILHADO: só tocar tabelas kaha_*. Sem exceção.
6. Migrations ADITIVAS podem ir ao banco antes do deploy. Mudança de
   CONTEÚDO que o código deployado renderiza (templates, textos) só entra
   JUNTO/APÓS o deploy do código correspondente — nunca antes.
   (Incidente 18/jul: template 0020 + código velho quebrou a produção.)
7. kaha_horarios usa dia_semana (0–6) + hora — nunca derivar de timestamp.
8. Nomes de exercícios desnormalizados em kaha_ficha_exercicios; desativar
   exercício da biblioteca nunca quebra ficha existente.
9. RPC kaha_responder_questionario (security definer) é o ÚNICO endpoint
   anônimo. Acessos novos sem auth user seguem esse padrão (token + RPCs
   security definer escopadas), nunca mexendo nas políticas existentes.
10. Seed sempre com seed=true. scripts/limpar-seed.sql funcional antes de
    qualquer entrega.

## Código e build
11. Lógica B0–B4 testada: NÃO refatorar sem pedido explícito.
12. /design/ é a fonte da verdade visual. Abrir o HTML antes de construir
    a tela. Nunca recriar de memória.
13. Régua dos cards: header 20px, números 34px Archivo itálico, rodapé
    margin-top:auto, align-items:stretch nos grids.
14. Cor de professor derivada do id de forma estável.
15. NUNCA rodar npm run build com o dev de pé (corrompe .next — incidente
    17/jul). Suspeita de cache: matar dev, rm -rf .next, subir limpo.

## Segurança e credenciais
16. NUNCA pedir/receber/registrar senha ou credencial em prompt, log ou
    relatório. Validação logada em tela é do João. Precisa validar
    autenticado? Propor usuário de teste descartável via seed.
17. Segredos só em .env.local / Vercel. Ao listar env: só NOMES de chaves.

## "Falar com vários" (anti-ban — número anterior já foi bloqueado)
18. Nunca o mesmo texto para todos. Um a um, com intervalo, teto diário.

# PROTOCOLO DE EXECUÇÃO
19. UM bloco por vez. Critério de aceite por bloco. NUNCA avançar sem o
    "APROVADO" explícito do João.
20. Aceite de tela = João valida em desktop E mobile.
21. Trabalho em branch. Merge para main só com OK explícito. main fica
    sempre apresentável (push na main = deploy).
22. Bloqueio: PARAR e reportar. Nunca inventar, contornar em silêncio ou
    expandir escopo.
23. Bug fora do escopo do bloco: registrar em Pendências, não corrigir sem
    autorização (exceção: regra 4).

# PROTOCOLO DE COMUNICAÇÃO (todo relatório neste formato)
5 campos, nesta ordem, máx. ~15 linhas (detalhe longo vai em arquivo):
✅ FATO (provado): o que foi feito + evidência (commit, query, saída).
🧪 VALIDAR (João): passos numerados com URL/rota. Se nada: "nada".
⛔ BLOQUEADO: o que trava e o que destrava. Se nada: "nada".
📋 PENDÊNCIAS: débitos fora de escopo, um por linha.
➡️ PRÓXIMO: UMA próxima ação proposta, aguardando OK.
Regras: hipótese se escreve "HIPÓTESE:" na frente, nunca misturada com
fato. Bloco só é concluído com o aceite do plano passando. Reprovação
reabre o MESMO bloco.

# FORA DE ESCOPO ATUAL (não construir sem novo acordo)
Envio automático (Meta Cloud API real) · financeiro na UI · refatoração
de B0–B4 · auth/RLS por papel (Fase 2) · Embedded Signup (Fase 4).
