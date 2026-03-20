import { getSupabaseServer } from "../supabase/server";
import type { Analise } from "../gemini/diarioSchema";

export type Refeicao = {
  id: string;
  imagem_url: string | null;
  resultado: Analise;
  created_at: string;
};

export type GetRefeicoesFilters = {
  startDate?: string;
  endDate?: string;
  limit?: number;
};

export async function getRefeicoes(filters: GetRefeicoesFilters = {}): Promise<Refeicao[]> {
  const supabaseServer = getSupabaseServer();

  let query = (supabaseServer as any).from("refeicoes").select("*").order("created_at", { ascending: false });

  if (filters.startDate) {
    query = query.gte("created_at", filters.startDate);
  }

  if (filters.endDate) {
    // Adiciona 1 dia para incluir o dia final completo
    const endDateWithDay = new Date(filters.endDate);
    endDateWithDay.setDate(endDateWithDay.getDate() + 1);
    query = query.lt("created_at", endDateWithDay.toISOString());
  }

  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Falha ao buscar refeições: ${error.message}`);
  }

  return data || [];
}
