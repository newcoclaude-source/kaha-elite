/**
 * wipe-demo.ts — apaga TODOS os dados demo/operacionais do piloto de uma vez.
 *
 * Escopo: SOMENTE tabelas com prefixo kaha_ (regra do projeto: nunca tocar
 * em tabelas fora do prefixo — o banco NewCO é compartilhado com o CRM
 * SellCloser). Apaga dados operacionais e PRESERVA os seeds de referência
 * (voz da Julia + biblioteca de exercícios), que o app precisa para funcionar.
 *
 * Autenticação: entra como o usuário piloto (RLS é authenticated-only). NÃO
 * usa service key — proibido no projeto. Requer as credenciais no ambiente.
 *
 * Uso:
 *   PILOTO_EMAIL=piloto@kahaelite.com PILOTO_SENHA='...' node scripts/wipe-demo.ts
 *   (Node 24+ roda .ts nativamente. URL/anon key são lidas de .env.local.)
 *
 * ⚠️  DESTRUTIVO E IRREVERSÍVEL. Não há confirmação interativa: só roda quando
 *     você realmente quer zerar o piloto.
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

// --- carrega .env.local sem depender de dotenv -----------------------------
function loadEnvLocal(): Record<string, string> {
  try {
    const raw = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    const out: Record<string, string> = {}
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (!m) continue
      out[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
    return out
  } catch {
    return {}
  }
}

const env = { ...loadEnvLocal(), ...process.env }

const URL = env.NEXT_PUBLIC_SUPABASE_URL
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const EMAIL = env.PILOTO_EMAIL
const SENHA = env.PILOTO_SENHA

if (!URL || !ANON) {
  console.error('Faltam NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY (.env.local).')
  process.exit(1)
}
if (!EMAIL || !SENHA) {
  console.error('Faltam PILOTO_EMAIL / PILOTO_SENHA no ambiente. RLS exige sessão.')
  process.exit(1)
}

// Ordem FK-safe: filhos antes dos pais. NÃO inclui kaha_templates nem
// kaha_exercicios_biblioteca (seeds de referência — apagá-los quebra o app).
const ORDEM_DELECAO = [
  'kaha_cargas',
  'kaha_ficha_exercicios',
  'kaha_mensagens',
  'kaha_feedbacks',
  'kaha_sessoes',
  'kaha_fichas',
  'kaha_horarios',
  'kaha_alunos',
  'kaha_professores',
] as const

const PRESERVADAS = ['kaha_templates', 'kaha_exercicios_biblioteca']

async function main() {
  const supabase = createClient(URL!, ANON!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { error: authErr } = await supabase.auth.signInWithPassword({
    email: EMAIL!,
    password: SENHA!,
  })
  if (authErr) {
    console.error('Falha no login do piloto:', authErr.message)
    process.exit(1)
  }

  console.log('Apagando dados demo (só kaha_*, preservando seeds)…\n')
  for (const tabela of ORDEM_DELECAO) {
    // .not('id','is',null) casa todas as linhas (id nunca é nulo) para
    // qualquer tipo de PK — o supabase-js exige um filtro no delete.
    const { error, count } = await supabase
      .from(tabela)
      .delete({ count: 'exact' })
      .not('id', 'is', null)
    if (error) {
      console.error(`  ✗ ${tabela}: ${error.message}`)
      process.exit(1)
    }
    console.log(`  ✓ ${tabela}: ${count ?? 0} linha(s) apagada(s)`)
  }

  console.log(`\nPreservadas (seeds): ${PRESERVADAS.join(', ')}`)
  console.log('Concluído.')
  await supabase.auth.signOut()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
