// Camada de dados da biblioteca de exercícios (B3.5). Roda no servidor.

import { createClient } from "@/lib/supabase/server";

export type ExercicioBiblioteca = {
  id: string;
  nome: string;
  grupo: string;
  equipamento: string | null;
  custom: boolean;
};

const COLS = "id, nome, grupo, equipamento, custom";

// Exercícios ativos, filtráveis por texto (nome) e por grupo. Ordena grupo→nome.
export async function listarBiblioteca(
  { busca, grupo }: { busca?: string; grupo?: string } = {},
): Promise<ExercicioBiblioteca[]> {
  const supabase = createClient();

  let q = supabase
    .from("kaha_exercicios_biblioteca")
    .select(COLS)
    .eq("ativo", true)
    .order("grupo", { ascending: true })
    .order("nome", { ascending: true });

  if (grupo) q = q.eq("grupo", grupo);
  if (busca && busca.trim()) q = q.ilike("nome", `%${busca.trim()}%`);

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as ExercicioBiblioteca[];
}

// Cria um exercício custom (quando falta algo na base). custom=true.
export async function criarExercicioCustom(dados: {
  nome: string;
  grupo: string;
  equipamento?: string | null;
}): Promise<ExercicioBiblioteca> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("kaha_exercicios_biblioteca")
    .insert({
      nome: dados.nome.trim(),
      grupo: dados.grupo,
      equipamento: dados.equipamento?.trim() || null,
      custom: true,
    })
    .select(COLS)
    .single();
  if (error) throw error;
  return data as ExercicioBiblioteca;
}
