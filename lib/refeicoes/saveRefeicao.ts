import { getSupabaseServer } from "../supabase/server";
import type { Analise } from "../gemini/diarioSchema";

export async function saveRefeicao({
  imageUrl,
  resultado
}: {
  imageUrl: string | null;
  resultado: Analise;
}) {
  // A coluna/table é definida no SQL abaixo (tabela `refeicoes`).
  const supabaseServer = getSupabaseServer();
  // Como não rodamos `supabase gen types`, o cliente não conhece schema.
  // Fazemos um cast local para permitir o insert com os campos esperados.
  const { error } = await (supabaseServer as any).from("refeicoes").insert({
    imagem_url: imageUrl,
    resultado
  });

  if (error) {
    throw new Error(`Falha ao salvar no banco: ${error.message}`);
  }
}

