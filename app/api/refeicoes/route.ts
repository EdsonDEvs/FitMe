import { getRefeicoes, type GetRefeicoesFilters } from "@/lib/refeicoes/getRefeicoes";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const filters: GetRefeicoesFilters = {
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined
    };

    const refeicoes = await getRefeicoes(filters);

    return Response.json(refeicoes, { status: 200 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro desconhecido";
    return Response.json({ error: message }, { status: 400 });
  }
}
